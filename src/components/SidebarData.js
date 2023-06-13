import React from 'react';
import * as FaIcons from 'react-icons/fa';
import * as AiIcons from 'react-icons/ai';
import * as IoIcons from 'react-icons/io';
import * as RiIcons from 'react-icons/ri';
import {ReactComponent as AnimMainLogo} from "../assets/AnimMainLogo.svg"

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
        title: 'Project 2',
        path: '/projects/projects2',
        icon: <IoIcons.IoIosPaper />,
        cName: 'sub-nav',
        target: ""
      },
      {
        title: 'Project 3',
        path: '/projects/projects3',
        icon: <IoIcons.IoIosPaper />,
        target: ""
      }
    ]
}
];
