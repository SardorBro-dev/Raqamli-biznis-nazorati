const ICON_PATHS = {
  home: "M3 9.5 10 4l7 5.5v6.5H12v-4H8v4H3V9.5Z",
  company: "M3 18h14M5 18V7l5-3 5 3v11M8 10h1m3 0h1m-5 3h1m3 0h1M9 18v-3h2v3",
  users: "M6.5 10a3 3 0 1 0 0-6 3 3 0 0 0 0 6ZM2 17a4.5 4.5 0 0 1 9 0M15 10a2.5 2.5 0 1 0 0-5M13 13.5a4 4 0 0 1 5 3.5",
  create: "M10 4v12M4 10h12",
  plan: "M3 7h14v9H3zM3 10h14M6 13h3",
  card: "M3 6h14v10H3zM3 9h14M6 13h3",
  chart: "M4 16V9M8 16V6M12 16v-4M16 16V4",
  notification: "M10 2.5a5.5 5.5 0 0 0-5.5 5.5v3.1L3 14v1h14l-1.5-2.9V8A5.5 5.5 0 0 0 10 2.5ZM7.5 16a2.5 2.5 0 0 0 5 0h-5Z",
  ai: "M10 2.8 11.5 7l4.2 1.5-4.2 1.5L10 14.2 8.5 10 4.3 8.5 8.5 7 10 2.8ZM16 13l.7 2.3L19 16l-2.3.7L16 19l-.7-2.3L13 16l2.3-.7L16 13Z",
  chat: "M3 5.5A2.5 2.5 0 0 1 5.5 3h9A2.5 2.5 0 0 1 17 5.5v5a2.5 2.5 0 0 1-2.5 2.5H9l-4.5 3v-3.4A2.5 2.5 0 0 1 3 10.5zM6.5 7h7M6.5 10h4",
  meeting: "M4 6.5A2.5 2.5 0 0 1 6.5 4h7A2.5 2.5 0 0 1 16 6.5v5a2.5 2.5 0 0 1-2.5 2.5h-7A2.5 2.5 0 0 1 4 11.5zM8 17h4M10 14v3M8.5 8.5l3 1.5-3 1.5z",
  camera: "M3.5 6.5h8a2 2 0 0 1 2 2v3a2 2 0 0 1-2 2h-8a2 2 0 0 1-2-2v-3a2 2 0 0 1 2-2ZM13.5 9l4-2v6l-4-2",
  microphone: "M10 3a2.5 2.5 0 0 0-2.5 2.5v4a2.5 2.5 0 0 0 5 0v-4A2.5 2.5 0 0 0 10 3ZM5.5 9.5a4.5 4.5 0 0 0 9 0M10 14v3M7 17h6",
  speaker: "M3 8h3l4-3v10l-4-3H3zM13 8.5a2.5 2.5 0 0 1 0 3M15 6.5a5.5 5.5 0 0 1 0 7",
  news: "M4 4h12v12H4zM7 8h6M7 11h6M7 14h3",
  settings: "M10 3.5 11 5.2a5 5 0 0 1 1.4.6l2-.5 1.3 2.2-1.5 1.4a5 5 0 0 1 0 1.6l1.5 1.4-1.3 2.2-2-.5a5 5 0 0 1-1.4.6L10 16.5H7.5l-1-1.7a5 5 0 0 1-1.4-.6l-2 .5-1.3-2.2 1.5-1.4a5 5 0 0 1 0-1.6L1.8 8.1l1.3-2.2 2 .5a5 5 0 0 1 1.4-.6l1-1.7zM8.75 10a1.5 1.5 0 1 0 3 0 1.5 1.5 0 0 0-3 0Z",
  logout: "M8 4H4v12h4M11 7l4 3-4 3M15 10H7",
};

function SidebarIcon({ name }) {
  return (
    <span className="sidebar-action-icon" aria-hidden="true">
      <svg viewBox="0 0 20 20"><path className={`sidebar-icon-path sidebar-icon-${name}`} d={ICON_PATHS[name]} /></svg>
    </span>
  );
}

export default SidebarIcon;
