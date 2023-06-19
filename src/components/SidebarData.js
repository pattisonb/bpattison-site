import React from 'react';
import * as AiIcons from 'react-icons/ai';
import * as IoIcons from 'react-icons/io';
import * as RiIcons from 'react-icons/ri';
import {ReactComponent as AnimMainLogo} from "../assets/AnimMainLogo.svg"
import {ReactComponent as GitHubLogo} from "../assets/GitHubLogo.svg"


export const SidebarData = [
  {
    title: 'Home',
    path: '/',
    icon: <AiIcons.AiFillHome />,
  },
  {
    title: 'Projects',
    path: '/projects',
    icon: <IoIcons.IoIosPaper />,
    iconClosed: <RiIcons.RiArrowDownSFill />,
    iconOpened: <RiIcons.RiArrowUpSFill />,

    subNav: [
      {
        title: 'Anim',
        path: 'https://anim.llc/',
        icon: <AnimMainLogo style={{ height: 20 }}/>,
        cName: 'sub-nav',
        target: "_blank"
      },
      {
        title: 'GitHub',
        path: 'https://github.com/pattisonb/',
        icon: <GitHubLogo style={{ height: 20 }}/>,
        cName: 'sub-nav',
        target: "_blank"
      }
    ]
}
];
