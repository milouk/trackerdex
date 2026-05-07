type Props = {
  generatedAt: string;
};

function utcShort(): string {
  return new Date().toISOString().slice(11, 16);
}

function radarAge(generatedAt: string): string {
  const ts = Date.parse(generatedAt);
  if (Number.isNaN(ts)) return "—";
  const days = Math.max(0, Math.floor((Date.now() - ts) / 86_400_000));
  return `${days}d AGO`;
}

export function Footstrip({ generatedAt }: Props): React.ReactElement {
  return (
    <footer className="ob-footstrip">
      <span className="ob-foot-cell">PI-HOLE v6 ·</span>
      <span className="ob-foot-cell">RADAR_FETCHED {radarAge(generatedAt)}</span>
      <span className="ob-foot-cell ob-foot-grow">
        FOCUS / · TIER F · DETAIL ↵
      </span>
      <span className="ob-foot-cell">UTC {utcShort()}</span>
    </footer>
  );
}
