const DEFAULT_PORT = 7331;

async function load() {
  const { daemonPort = DEFAULT_PORT } = await chrome.storage.sync.get("daemonPort");
  document.getElementById("daemon-port").value = daemonPort;
}

document.getElementById("btn-save").addEventListener("click", async () => {
  const port = parseInt(document.getElementById("daemon-port").value, 10);
  await chrome.storage.sync.set({ daemonPort: port });
  const status = document.getElementById("save-status");
  status.textContent = "Saved ✓";
  setTimeout(() => { status.textContent = ""; }, 2000);
});

load();
