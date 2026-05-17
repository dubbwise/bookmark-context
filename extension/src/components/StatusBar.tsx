export default function StatusBar({ online, backend }: { online: boolean | null; backend: string }) {
  return <footer><span>daemon {online ? `Online · ${backend}` : "offline"}</span></footer>;
}
