import {
  FaSpotify,
  FaGithub,
  FaVoteYea,
  FaLayerGroup,
} from "react-icons/fa";

export const ProjectsData = [
  {
    title: "Spotify Stats",
    blurb:
      "Shows what I'm playing right now, plus my most-played tracks and artists. It pulls straight from the Spotify API.",
    href: "/projects/spotify",
    internal: true,
    tag: "Live data",
    icon: FaSpotify,
    accent: "#1db954",
  },
  {
    title: "Spotify Voting",
    blurb:
      "A small app for picking what plays next. Friends vote on tracks and the queue reorders as they do.",
    href: "https://spotifyvote.web.app/",
    internal: false,
    tag: "Web app",
    icon: FaVoteYea,
    accent: "#4f46e5",
  },
  {
    title: "Anim",
    blurb:
      "A venture I'm part of. Head over to see what we're working on.",
    href: "https://anim.llc/",
    internal: false,
    tag: "Venture",
    icon: FaLayerGroup,
    accent: "#7c3aed",
  },
  {
    title: "GitHub",
    blurb:
      "Where the rest of my code lives, including the source for this site.",
    href: "https://github.com/pattisonb/",
    internal: false,
    tag: "Open source",
    icon: FaGithub,
    accent: "#64748b",
  },
];
