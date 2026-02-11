#!/usr/bin/env python3
"""OpenTranscribe CLI Interface with integrated API server."""
import os
import sys
import subprocess
import time
import signal
import threading
import atexit

from rich.console import Console
from rich.panel import Panel
from rich.prompt import Prompt, Confirm
from rich.table import Table
from rich.progress import Progress, SpinnerColumn, TextColumn, BarColumn
from rich.live import Live
from rich.spinner import Spinner
import questionary

# Add backend to path for imports
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from models import get_model, list_models, get_available_models, get_default_model
from models.base import TranscriptionResult
from diff import DiffEngine
from streaming import VoskStreamingTranscriber
from streaming.vosk_streaming import StreamingConfig, RecordingMode, OutputMode

console = Console()

# Global server process
_server_process = None
_server_thread = None


def setup_cuda_environment():
    """Set up CUDA library paths for GPU support."""
    try:
        import nvidia.cublas.lib
        import nvidia.cudnn.lib

        paths = []

        if hasattr(nvidia.cublas.lib, '__file__') and nvidia.cublas.lib.__file__:
            paths.append(os.path.dirname(nvidia.cublas.lib.__file__))
        elif hasattr(nvidia.cublas.lib, '__path__'):
            paths.append(list(nvidia.cublas.lib.__path__)[0])

        if hasattr(nvidia.cudnn.lib, '__file__') and nvidia.cudnn.lib.__file__:
            paths.append(os.path.dirname(nvidia.cudnn.lib.__file__))
        elif hasattr(nvidia.cudnn.lib, '__path__'):
            paths.append(list(nvidia.cudnn.lib.__path__)[0])

        if paths:
            existing = os.environ.get("LD_LIBRARY_PATH", "")
            new_path = ":".join(paths)
            if new_path not in existing:
                os.environ["LD_LIBRARY_PATH"] = f"{new_path}:{existing}" if existing else new_path
    except ImportError:
        pass


def start_api_server():
    """Start the API server in the background."""
    global _server_process

    if _server_process and _server_process.poll() is None:
        return True  # Already running

    backend_dir = os.path.dirname(os.path.abspath(__file__))

    # Set up environment with CUDA support
    env = os.environ.copy()
    try:
        import nvidia.cublas.lib
        import nvidia.cudnn.lib
        paths = []
        if hasattr(nvidia.cublas.lib, '__path__'):
            paths.append(list(nvidia.cublas.lib.__path__)[0])
        if hasattr(nvidia.cudnn.lib, '__path__'):
            paths.append(list(nvidia.cudnn.lib.__path__)[0])
        if paths:
            existing = env.get("LD_LIBRARY_PATH", "")
            new_path = ":".join(paths)
            env["LD_LIBRARY_PATH"] = f"{new_path}:{existing}" if existing else new_path
    except ImportError:
        pass

    try:
        _server_process = subprocess.Popen(
            [sys.executable, "-m", "uvicorn", "main:app", "--host", "127.0.0.1", "--port", "8000"],
            cwd=backend_dir,
            env=env,
            stdout=subprocess.DEVNULL,
            stderr=subprocess.DEVNULL,
            start_new_session=True
        )

        # Wait a moment for server to start
        time.sleep(2)

        # Verify server is running
        if _server_process.poll() is None:
            return True
        else:
            return False

    except Exception as e:
        console.print(f"[red]Failed to start server: {e}[/red]")
        return False


def stop_api_server():
    """Stop the API server."""
    global _server_process

    if _server_process:
        try:
            # Send SIGTERM to process group
            pgid = os.getpgid(_server_process.pid)
            os.killpg(pgid, signal.SIGTERM)
            _server_process.wait(timeout=5)
        except ProcessLookupError:
            # Process already exited
            pass
        except subprocess.TimeoutExpired:
            try:
                pgid = os.getpgid(_server_process.pid)
                os.killpg(pgid, signal.SIGKILL)
                _server_process.wait(timeout=3)
            except (ProcessLookupError, subprocess.TimeoutExpired):
                pass
        except OSError:
            # Process group may no longer exist
            pass
        finally:
            _server_process = None


def is_server_running():
    """Check if API server is running."""
    global _server_process
    return _server_process is not None and _server_process.poll() is None


def cleanup():
    """Clean up server process on exit."""
    stop_api_server()


# Register cleanup on exit
atexit.register(cleanup)


def clear_screen():
    """Clear the terminal screen."""
    os.system('cls' if os.name == 'nt' else 'clear')


def print_header():
    """Print the application header."""
    clear_screen()

    server_status = "[green]● Running[/green]" if is_server_running() else "[red]● Stopped[/red]"

    title = f"""
    ╔════════════════════════════════════════════════════════════════╗
    ║                 OPENTRANSCRIBE CLI                             ║
    ║           Multi-Model Audio Transcription Tool                 ║
    ║                                                                ║
    ║   API Server: {server_status}                                     ║
    ╚════════════════════════════════════════════════════════════════╝
    """
    console.print(Panel(title, style="bold green", border_style="green"))


def list_available_models():
    """Display available models."""
    print_header()
    console.print("[bold yellow]Available STT Models[/bold yellow]\n")

    table = Table(title="Installed Models")
    table.add_column("ID", style="cyan")
    table.add_column("Name", style="bold")
    table.add_column("Available", justify="center")
    table.add_column("GPU", justify="center")
    table.add_column("Streaming", justify="center")
    table.add_column("Description")

    for model_info in list_models():
        available = "✓" if model_info.get("available") else "✗"
        available_style = "green" if model_info.get("available") else "red"
        gpu = "Yes" if model_info.get("requires_gpu") else "No"
        streaming = "Yes" if model_info.get("supports_streaming") else "No"

        table.add_row(
            model_info.get("id", "?"),
            model_info.get("name", "?"),
            f"[{available_style}]{available}[/{available_style}]",
            gpu,
            streaming,
            model_info.get("description", "")[:40] + "..."
        )

    console.print(table)
    console.print(f"\n[dim]Default model: {get_default_model()}[/dim]")


def select_model() -> str:
    """Interactive model selection."""
    available = get_available_models()
    models_info = {m["id"]: m for m in list_models()}

    choices = []
    for model_id in available:
        info = models_info.get(model_id, {})
        name = info.get("name", model_id)
        desc = info.get("description", "")[:30]

        if model_id == get_default_model():
            label = f"{name} (recommended)"
        else:
            label = f"{name} - {desc}"

        choices.append(questionary.Choice(label, value=model_id))

    if not choices:
        console.print("[red]No models available![/red]")
        return get_default_model()

    choice = questionary.select(
        "Select Model:",
        choices=choices,
        use_arrow_keys=True
    ).ask()

    return choice or get_default_model()


def transcribe_file():
    """Transcribe a single file with selected model."""
    print_header()
    console.print("[bold yellow]Transcribe Audio File[/bold yellow]\n")

    file_path = Prompt.ask("Enter path to audio file")
    if not os.path.exists(file_path):
        console.print(f"[red]File not found: {file_path}[/red]")
        return

    model_id = select_model()
    if not model_id:
        return

    language = questionary.select(
        "Select Language:",
        choices=[
            questionary.Choice("Auto-detect", value="auto"),
            questionary.Choice("English", value="en"),
            questionary.Choice("Spanish", value="es"),
        ],
        use_arrow_keys=True
    ).ask()

    try:
        transcriber = get_model(model_id)

        console.print(f"\n[cyan]Loading {transcriber.name}...[/cyan]")

        with Progress(
            SpinnerColumn(),
            TextColumn("[progress.description]{task.description}"),
            transient=True
        ) as progress:
            task = progress.add_task(f"[cyan]Transcribing with {transcriber.name}...", total=None)

            start_time = time.time()
            result = transcriber.transcribe(file_path, language=language)
            duration = time.time() - start_time

            progress.update(task, completed=True)

        console.print(Panel(
            result.text[:1000] + ("..." if len(result.text) > 1000 else ""),
            title=f"Transcription Result ({transcriber.name})",
            border_style="green"
        ))

        console.print(f"\n[dim]Time taken: {duration:.2f}s | Language: {result.language}[/dim]")

        if Confirm.ask("Save transcription to file?", default=True):
            output_path = f"{file_path}.{model_id}.txt"
            with open(output_path, "w") as f:
                f.write(result.text)
            console.print(f"[green]Saved to {output_path}[/green]")

    except ImportError as e:
        console.print(f"[red]Error: Missing dependency {e}.[/red]")
    except Exception as e:
        console.print(f"[red]Transcription failed: {str(e)}[/red]")


def compare_models():
    """Compare transcription results from multiple models."""
    print_header()
    console.print("[bold yellow]Compare All Models[/bold yellow]\n")

    file_path = Prompt.ask("Enter path to audio file")
    if not os.path.exists(file_path):
        console.print(f"[red]File not found: {file_path}[/red]")
        return

    available = get_available_models()
    models_info = {m["id"]: m for m in list_models()}

    if len(available) < 2:
        console.print("[red]Need at least 2 models for comparison![/red]")
        return

    choices = []
    for model_id in available:
        info = models_info.get(model_id, {})
        name = info.get("name", model_id)
        checked = model_id in ["faster-whisper", "openai-whisper", "vosk"]
        choices.append(questionary.Choice(name, value=model_id, checked=checked))

    selected = questionary.checkbox(
        "Select models to compare (Space to toggle, Enter to confirm):",
        choices=choices
    ).ask()

    if not selected or len(selected) < 2:
        console.print("[red]Please select at least 2 models[/red]")
        return

    language = questionary.select(
        "Select Language:",
        choices=[
            questionary.Choice("Auto-detect", value="auto"),
            questionary.Choice("English", value="en"),
            questionary.Choice("Spanish", value="es"),
        ],
        use_arrow_keys=True
    ).ask()

    console.print(f"\n[cyan]Running comparison with {len(selected)} models...[/cyan]\n")

    results: list[TranscriptionResult] = []

    with Progress(
        SpinnerColumn(),
        TextColumn("[progress.description]{task.description}"),
        BarColumn(),
        TextColumn("[progress.percentage]{task.percentage:>3.0f}%"),
    ) as progress:
        task = progress.add_task("Transcribing...", total=len(selected))

        for model_id in selected:
            try:
                progress.update(task, description=f"Running {model_id}...")

                transcriber = get_model(model_id)
                result = transcriber.transcribe(file_path, language=language)
                results.append(result)

                progress.advance(task)

            except Exception as e:
                console.print(f"[yellow]Warning: {model_id} failed: {e}[/yellow]")
                progress.advance(task)

    if len(results) < 2:
        console.print("[red]Not enough successful transcriptions for comparison[/red]")
        return

    baseline = results[0]
    diff_engine = DiffEngine(baseline)

    comparisons = [diff_engine.compare(r) for r in results[1:]]

    console.print()
    diff_engine.render_comparison(comparisons, console)

    if Confirm.ask("\nSave comparison report to file?", default=True):
        output_path = f"{file_path}.comparison.txt"

        with open(output_path, "w") as f:
            f.write("=" * 70 + "\n")
            f.write("MODEL COMPARISON RESULTS\n")
            f.write("=" * 70 + "\n\n")

            f.write(f"Baseline: {baseline.model_name} ({baseline.duration:.2f}s)\n")
            f.write(f"Text: {baseline.text}\n\n")

            for comp in comparisons:
                f.write(f"{comp.model_name} ({comp.duration:.2f}s) - {comp.match_percent:.0f}% match\n")
                if comp.diffs:
                    f.write("Differences:\n")
                    for diff in comp.diffs:
                        f.write(f"  - Word #{diff.word_index}: '{diff.baseline_word}' -> '{diff.model_word}'\n")
                f.write("\n")

        console.print(f"[green]Saved to {output_path}[/green]")


def live_transcription():
    """Real-time voice transcription using microphone."""
    print_header()
    console.print("[bold yellow]Live Voice Transcription[/bold yellow]\n")

    # Check if sounddevice is available
    try:
        import sounddevice as sd
        import numpy as np
    except ImportError:
        console.print("[red]Error: sounddevice is not installed.[/red]")
        console.print("[dim]Install with: pip install sounddevice numpy[/dim]")
        return

    # Check if Vosk is available
    transcriber = VoskStreamingTranscriber()
    if not transcriber.is_available():
        console.print("[red]Error: Vosk is not installed.[/red]")
        console.print("[dim]Install with: pip install vosk[/dim]")
        return

    # Select recording mode
    mode_choice = questionary.select(
        "Select Recording Mode:",
        choices=[
            questionary.Choice("Toggle (click to start/stop)", value="toggle"),
            questionary.Choice("Push-to-Talk (hold Enter)", value="push_to_talk"),
            questionary.Choice("Voice Activated (auto-detect speech)", value="vad"),
            questionary.Choice("Toggle + VAD (toggle with auto-pause)", value="toggle_vad"),
        ],
        use_arrow_keys=True
    ).ask()

    if not mode_choice:
        return

    # Select output mode
    output_choice = questionary.select(
        "Select Output Mode:",
        choices=[
            questionary.Choice("Display Only", value="display"),
            questionary.Choice("Auto-save to file", value="auto_save"),
            questionary.Choice("Copy to clipboard", value="clipboard"),
        ],
        use_arrow_keys=True
    ).ask()

    if not output_choice:
        return

    # Configure transcriber
    mode_map = {
        "push_to_talk": RecordingMode.PUSH_TO_TALK,
        "toggle": RecordingMode.TOGGLE,
        "vad": RecordingMode.VAD,
        "toggle_vad": RecordingMode.TOGGLE_VAD,
    }
    output_map = {
        "display": OutputMode.DISPLAY,
        "auto_save": OutputMode.AUTO_SAVE,
        "clipboard": OutputMode.CLIPBOARD,
    }

    config = StreamingConfig(
        recording_mode=mode_map[mode_choice],
        output_mode=output_map[output_choice],
        vad_enabled=mode_choice in ("vad", "toggle_vad"),
        silence_timeout=1.5,
    )

    transcriber = VoskStreamingTranscriber(config)

    # Audio parameters
    SAMPLE_RATE = 16000
    CHANNELS = 1
    BLOCK_SIZE = 4000  # ~250ms chunks

    # State
    is_recording = False
    is_push_to_talk_active = False
    accumulated_text = []
    current_partial = ""

    def audio_callback(indata, frames, time_info, status):
        nonlocal current_partial, accumulated_text

        if not transcriber.is_recording:
            return

        # For push-to-talk, only process when active
        if mode_choice == "push_to_talk" and not is_push_to_talk_active:
            return

        # Convert float32 to int16 PCM
        audio_data = (indata[:, 0] * 32767).astype(np.int16).tobytes()

        # Process through transcriber
        results = transcriber.process_chunk(audio_data)

        for result in results:
            if result.type == "partial":
                current_partial = result.text
            elif result.type == "final":
                if result.text:
                    accumulated_text.append(result.text)
                    current_partial = ""
            elif result.type == "vad":
                pass  # Could display speaking indicator

    console.print("\n[bold cyan]Live Transcription Ready[/bold cyan]")
    console.print(f"[dim]Mode: {mode_choice} | Output: {output_choice}[/dim]\n")

    if mode_choice == "push_to_talk":
        console.print("[yellow]Hold Enter to speak, release to pause[/yellow]")
        console.print("[yellow]Type 'q' and Enter to stop[/yellow]\n")
    elif mode_choice == "toggle":
        console.print("[yellow]Press Enter to start/stop recording[/yellow]")
        console.print("[yellow]Type 'q' and Enter to quit[/yellow]\n")
    else:
        console.print("[yellow]Press Enter to start, 'q' to quit[/yellow]\n")

    try:
        # Start audio stream
        with sd.InputStream(
            samplerate=SAMPLE_RATE,
            channels=CHANNELS,
            dtype='float32',
            blocksize=BLOCK_SIZE,
            callback=audio_callback
        ):
            # Start transcription session
            transcriber.start_session()
            is_recording = True

            console.print("[green]● Recording started[/green]\n")
            console.print("[bold]Transcription:[/bold]")
            console.print("-" * 50)

            # Main loop
            while True:
                try:
                    # Non-blocking input check would be ideal, but for simplicity:
                    if mode_choice == "push_to_talk":
                        # For push-to-talk, we need a different approach
                        import select
                        import sys

                        # Check if input is available (Unix only)
                        if sys.platform != 'win32':
                            if select.select([sys.stdin], [], [], 0.1)[0]:
                                line = sys.stdin.readline().strip()
                                if line.lower() == 'q':
                                    break
                                is_push_to_talk_active = True
                            else:
                                is_push_to_talk_active = False
                        else:
                            # Windows: simple blocking approach
                            line = input()
                            if line.lower() == 'q':
                                break
                            is_push_to_talk_active = not is_push_to_talk_active
                    else:
                        # Toggle mode: wait for input
                        line = input()
                        if line.lower() == 'q':
                            break

                        # Toggle recording
                        if is_recording:
                            result = transcriber.stop_session()
                            is_recording = False
                            console.print("\n[red]● Recording paused[/red]")

                            if result.text:
                                console.print(f"\n[green]Final:[/green] {result.text}")
                        else:
                            transcriber.start_session()
                            is_recording = True
                            console.print("[green]● Recording resumed[/green]")

                    # Display current transcription
                    if accumulated_text or current_partial:
                        display = " ".join(accumulated_text)
                        if current_partial:
                            display += f" [dim italic]{current_partial}[/dim italic]"
                        # Use carriage return to update same line
                        console.print(f"\r{display}", end="")

                except KeyboardInterrupt:
                    break

    except Exception as e:
        console.print(f"\n[red]Error: {e}[/red]")

    finally:
        # Stop transcription
        if transcriber.is_recording:
            result = transcriber.stop_session()
            if result.text:
                accumulated_text.append(result.text.strip())

        console.print("\n\n[yellow]● Recording stopped[/yellow]")
        console.print("-" * 50)

        # Final text
        final_text = " ".join(accumulated_text)
        if final_text:
            console.print(f"\n[bold green]Final Transcription:[/bold green]\n{final_text}\n")

            # Handle output mode
            if output_choice == "clipboard":
                try:
                    import pyperclip
                    pyperclip.copy(final_text)
                    console.print("[green]Copied to clipboard![/green]")
                except ImportError:
                    console.print("[yellow]Install pyperclip for clipboard support: pip install pyperclip[/yellow]")

            elif output_choice == "auto_save":
                output_path = f"transcription_{int(time.time())}.txt"
                with open(output_path, "w") as f:
                    f.write(final_text)
                console.print(f"[green]Saved to {output_path}[/green]")

            elif Confirm.ask("Save transcription to file?", default=False):
                output_path = Prompt.ask("Output filename", default=f"transcription_{int(time.time())}.txt")
                with open(output_path, "w") as f:
                    f.write(final_text)
                console.print(f"[green]Saved to {output_path}[/green]")
        else:
            console.print("[dim]No speech detected[/dim]")


def manage_server():
    """Manage the API server."""
    print_header()
    console.print("[bold yellow]API Server Management[/bold yellow]\n")

    if is_server_running():
        console.print("[green]Server is currently running on http://127.0.0.1:8000[/green]\n")

        action = questionary.select(
            "What would you like to do?",
            choices=[
                questionary.Choice("Restart Server", value="restart"),
                questionary.Choice("Stop Server", value="stop"),
                questionary.Choice("Back to Main Menu", value="back"),
            ]
        ).ask()

        if action == "restart":
            console.print("[yellow]Restarting server...[/yellow]")
            stop_api_server()
            time.sleep(1)
            if start_api_server():
                console.print("[green]Server restarted successfully![/green]")
            else:
                console.print("[red]Failed to restart server[/red]")
        elif action == "stop":
            console.print("[yellow]Stopping server...[/yellow]")
            stop_api_server()
            console.print("[green]Server stopped[/green]")
    else:
        console.print("[red]Server is not running[/red]\n")

        if Confirm.ask("Start the server?", default=True):
            console.print("[yellow]Starting server...[/yellow]")
            if start_api_server():
                console.print("[green]Server started on http://127.0.0.1:8000[/green]")
            else:
                console.print("[red]Failed to start server[/red]")


def main_menu():
    """Main menu loop."""
    # Set up CUDA environment
    setup_cuda_environment()

    # Auto-start API server
    console.print("[cyan]Starting API server...[/cyan]")
    if start_api_server():
        console.print("[green]API server started on http://127.0.0.1:8000[/green]")
    else:
        console.print("[yellow]Warning: Could not start API server[/yellow]")

    time.sleep(1)

    while True:
        print_header()

        choices = [
            questionary.Choice("Transcribe Audio File", value="1"),
            questionary.Choice("Live Voice Transcription", value="2"),
            questionary.Choice("Compare All Models", value="3"),
            questionary.Choice("List Available Models", value="4"),
            questionary.Separator(),
            questionary.Choice("Manage API Server", value="5"),
            questionary.Separator(),
            questionary.Choice("Exit", value="0")
        ]

        choice = questionary.select(
            "Select a Task:",
            choices=choices,
            use_arrow_keys=True
        ).ask()

        if choice == "1":
            transcribe_file()
            input("\nPress Enter to continue...")
        elif choice == "2":
            live_transcription()
            input("\nPress Enter to continue...")
        elif choice == "3":
            compare_models()
            input("\nPress Enter to continue...")
        elif choice == "4":
            list_available_models()
            input("\nPress Enter to continue...")
        elif choice == "5":
            manage_server()
            input("\nPress Enter to continue...")
        elif not choice or choice == "0":
            console.print("[yellow]Stopping API server...[/yellow]")
            stop_api_server()
            console.print("[bold]Goodbye![/bold]")
            sys.exit(0)


if __name__ == "__main__":
    try:
        main_menu()
    except KeyboardInterrupt:
        console.print("\n[bold red]Interrupted. Cleaning up...[/bold red]")
        stop_api_server()
        sys.exit(0)
