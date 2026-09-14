import { AudioWaveform, ArrowUpRight, Headphones } from 'lucide-react';

const heights = Array.from({ length: 72 }, (_, i) =>
  12 + Math.abs(Math.sin(i * .54) * Math.cos(i * .17)) * 78
);

export default function StudioPreview() {
  return (
    <figure className="studio-preview" aria-label="Illustrative transcript preview">
      <div className="studio-preview-top"><span><AudioWaveform size={16} /> THE LISTENING ROOM</span><span>EXAMPLE / 001</span></div>
      <div className="studio-recording">
        <div className="studio-disc" aria-hidden="true"><div><AudioWaveform size={34} strokeWidth={1} /></div></div>
        <div className="studio-recording-copy"><span>FROM SOUND TO SOMETHING USEFUL</span><h2>A conversation.<br />A thousand possibilities.</h2><p><Headphones size={13} /> Interview · Original audio</p></div>
      </div>
      <div className="studio-waveform" aria-hidden="true">
        {heights.map((height, i) => <span key={i} style={{ height: `${height}%` }} />)}
        <div className="studio-playhead" />
      </div>
      <div className="studio-timeline"><span>00:00</span><span>AUDIO → TEXT</span><span>00:32</span></div>
      <div className="studio-transcript"><span className="studio-timecode">00:14</span><p>“The best ideas usually start with a conversation. <mark>This is where we keep them.</mark>”</p></div>
      <figcaption><span>Capture the words. Keep the context.</span><span>TXT / SRT / VTT <ArrowUpRight size={14} /></span></figcaption>
    </figure>
  );
}
