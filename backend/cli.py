#!/usr/bin/env python3
"""OpenTranscribe CLI Interface"""
import os
import sys
import subprocess
import time
from rich.console import Console
from rich.panel import Panel
from rich.prompt import Prompt, Confirm
from rich.table import Table
from rich import print as rprint
from rich.progress import Progress, SpinnerColumn, TextColumn
import questionary

console = Console()

def clear_screen():
    os.system('cls' if os.name == 'nt' else 'clear')

def print_header():
    clear_screen()
    title = """
    ╔════════════════════════════════════════════════════════════════╗
    ║                 OPENTRANSCRIBE CLI                             ║
    ║             Offline Audio Transcription Tool                   ║
    ╚════════════════════════════════════════════════════════════════╝
    """
    console.print(Panel(title, style="bold green", border_style="green"))

def run_server():
    console.print("[yellow]Starting OpenTranscribe API Server...[/yellow]")
    console.print("[dim]Press Ctrl+C to stop the server[/dim]\n")
    try:
        # Run uvicorn in a subprocess
        cmd = [sys.executable, "-m", "uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8000", "--reload"]
        subprocess.run(cmd, cwd=os.path.dirname(os.path.abspath(__file__)))
    except KeyboardInterrupt:
        console.print("\n[green]Server stopped.[/green]")

def transcribe_file():
    print_header()
    # No questionary choice here mainly because it's a file path input.
    # But we can perhaps offer a file browser? No, stick to Prompt.ask for now but maybe style it?
    # Actually, let's keep Prompt.ask for file paths as questionary.path is not always available/reliable without completion setups.
    
    console.print("[bold yellow]Transcribe Audio File[/bold yellow]")
    
    file_path = Prompt.ask("Enter path to audio file")
    if not os.path.exists(file_path):
        console.print(f"[red]File not found: {file_path}[/red]")
        return

    try:
        import whisper
        from pydub import AudioSegment
        
        console.print(f"\n[cyan]Loading Whisper model (tiny)...[/cyan]")
        model = whisper.load_model("tiny")
        
        console.print(f"[cyan]Loading audio file...[/cyan]")
        audio = AudioSegment.from_file(file_path)
        
        # 10 minute chunks
        chunk_length_ms = 10 * 60 * 1000
        chunks = [audio[i:i + chunk_length_ms] for i in range(0, len(audio), chunk_length_ms)]
        
        full_text = ""
        
        console.print(f"[cyan]Transcribing {len(chunks)} chunks...[/cyan]")
        
        start_time = time.time()
        
        with Progress(
            SpinnerColumn(),
            TextColumn("[progress.description]{task.description}"),
            transient=True
        ) as progress:
            task = progress.add_task("[cyan]Transcribing...", total=len(chunks))
            
            for i, chunk in enumerate(chunks):
                progress.update(task, description=f"Transcribing chunk {i+1}/{len(chunks)}...")
                
                # Export chunk to temp file
                chunk_path = f"temp_chunk_{i}.wav"
                chunk.export(chunk_path, format="wav")
                
                # Transcribe chunk
                result = model.transcribe(chunk_path)
                
                # Process segments for better formatting
                chunk_start_seconds = i * (chunk_length_ms / 1000)
                
                if "segments" in result:
                    for segment in result["segments"]:
                        start_time = segment["start"] + chunk_start_seconds
                        text = segment["text"].strip()
                        
                        # Format timestamp [MM:SS]
                        minutes = int(start_time // 60)
                        seconds = int(start_time % 60)
                        timestamp = f"[{minutes:02d}:{seconds:02d}]"
                        
                        formatted_line = f"{timestamp} {text}\n"
                        full_text += formatted_line
                else:
                    # Fallback if no segments
                    full_text += result["text"] + "\n"
                
                # Clean up
                os.remove(chunk_path)
                progress.advance(task)
        
        duration = time.time() - start_time
        full_text = full_text.strip()
        
        console.print(Panel(full_text[:500] + "...", title="Transcription Result (Preview)", border_style="green"))
        console.print(f"\n[dim]Time taken: {duration:.2f}s[/dim]")
        
        # Save option
        if Confirm.ask("Save transcription to file?", default=True):
            output_path = f"{file_path}.txt"
            with open(output_path, "w") as f:
                f.write(full_text)
            console.print(f"[green]Saved to {output_path}[/green]")
            
    except ImportError as e:
        console.print(f"[red]Error: Missing dependency {e}.[/red]")
        console.print("Install with: pip install openai-whisper pydub")
    except Exception as e:
        console.print(f"[red]Transcription failed: {str(e)}[/red]")

def main_menu():
    while True:
        print_header()
        
        choices = [
            questionary.Choice("Start API Server", value="1"),
            questionary.Choice("Transcribe Audio File (Offline)", value="2"),
            questionary.Separator(),
            questionary.Choice("Exit", value="0")
        ]
        
        choice = questionary.select(
            "Select a Task:",
            choices=choices,
            use_arrow_keys=True
        ).ask()
        
        if choice == "1":
            run_server()
            input("\nPress Enter to continue...")
        elif choice == "2":
            transcribe_file()
            input("\nPress Enter to continue...")
        elif not choice or choice == "0":
            console.print("[bold]Goodbye![/bold]")
            sys.exit(0)

if __name__ == "__main__":
    try:
        main_menu()
    except KeyboardInterrupt:
        console.print("\n[bold red]Interrupted. Exiting...[/bold red]")
        sys.exit(0)
