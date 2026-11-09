const shapes = {
  search: <><circle cx="10.5" cy="10.5" r="7.25" /><path d="m16 16 5 5" /></>,
  user: <><circle cx="12" cy="7.5" r="4.5" /><path d="M3.5 22v-1.5a8.5 7 0 0 1 17 0V22z" /></>,
  heart: <path d="M12 21 3.4 12.7C-2 7.2 5.4.7 10 5.4l2 2 2-2c4.6-4.7 12 1.8 6.6 7.3Z" />,
  bag: <><path d="M5 7h14l2 15H3Z" /><path d="M8 9V5a4 4 0 0 1 8 0v4" /></>,
  arrow: <path d="M3 12h17m-7-6 7 6-7 6" />,
  pointer: <><circle cx="12" cy="12" r="11" /><path d="m9 6 7 7-3.5.4 1.6 3.5-1.8.8-1.6-3.5-2.2 2.2Z" /></>,
  info: <><circle cx="12" cy="12" r="11" /><path d="M12 11v6m0-10v.2" strokeWidth="2" /></>,
  layers: <><path d="m1 8 11-7 11 7-11 7Z" /><path d="m1 12 11 7 11-7M1 16l11 7 11-7" /></>,
  filter: <path d="M4 6h16M7 12h10m-7 6h4" />,
  menu: <path d="M3 8h18M3 15h13" strokeWidth="1.65" />,
  close: <path d="m5 5 14 14M19 5 5 19" />,
  plus: <path d="M4 12h16m-8-8v16" />,
  check: <path d="m4 12 5 5L20 6" />,
  reset: <path d="M3 5v6h6M3.8 10a8.5 8.5 0 1 1 1 7.7" />,
  upload: <path d="M3 15v6h18v-6m-9 2V3m-5 5 5-5 5 5" />,
  camera: <><path d="M3 6h5l2-3h4l2 3h5v15H3Z" /><circle cx="12" cy="13" r="4" /></>,
  zoomIn: <><circle cx="10" cy="10" r="7" /><path d="m15 15 6 6M6.5 10h7M10 6.5v7" /></>,
  zoomOut: <><circle cx="10" cy="10" r="7" /><path d="m15 15 6 6M6.5 10h7" /></>,
  left: <path d="m14 6-6 6 6 6" />,
  right: <path d="m10 6 6 6-6 6" />,
};

export function Icon({ name }: { name: keyof typeof shapes }) {
  return (
    <svg aria-hidden="true" viewBox="0 0 24 24" width="24" height="24"
      fill="none" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round">
      {shapes[name]}
    </svg>
  );
}
