// SubMenu.js
import React, { useState } from 'react';
import styled, { css } from 'styled-components';
import { Link } from 'react-router-dom';

const SidebarLink = styled(Link)`
  display: flex;
  color: #e1e9fc;
  justify-content: space-between;
  align-items: center;
  padding: 20px;
  list-style: none;
  height: 60px;
  text-decoration: none;
  font-size: 18px;

  &:hover {
    background: #252831;
    border-left: 4px solid #632ce4;
    cursor: pointer;
  }

  ${({ isCurrentPage }) =>
    isCurrentPage &&
    css`
      background: #252831;
      border-left: 4px solid #632ce4;
    `}
`;

const SidebarMenu = styled.span`
  display: flex;
  color: #e1e9fc;
  justify-content: space-between;
  align-items: center;
  padding: 20px;
  list-style: none;
  height: 60px;
  text-decoration: none;
  font-size: 18px;

  &:hover {
    background: #252831;
    border-left: 4px solid #632ce4;
    cursor: pointer;
  }

  ${({ isCurrentPage }) =>
    isCurrentPage &&
    css`
      background: #252831;
      border-left: 4px solid #632ce4;
    `}
`;

const SidebarLabel = styled.span`
  margin-left: 16px;
`;

const DropdownLink = styled(Link)`
  background: #414757;
  height: 60px;
  padding-left: 3rem;
  display: flex;
  align-items: center;
  text-decoration: none;
  color: #f5f5f5;
  font-size: 18px;

  &:hover {
    background: #632ce4;
    cursor: pointer;
  }

  ${({ isCurrentPage }) =>
    isCurrentPage &&
    css`
      background: #632ce4;
    `}
`;

const SubMenu = ({ item, closeSidebar, isCurrentPage }) => {
  const [subnav, setSubnav] = useState(false);

  const showSubnav = () => setSubnav(!subnav);

  const handleSubmenuClick = () => {
    if (item.subNav) {
      showSubnav();
    } else {
      closeSidebar();
    }
  };

  return (
    <>
      {item.subNav ? (
        <SidebarMenu onClick={handleSubmenuClick} isCurrentPage={isCurrentPage}>
          <div>
            {item.icon}
            <SidebarLabel>{item.title}</SidebarLabel>
          </div>
          <div>{item.subNav && subnav ? item.iconOpened : item.iconClosed}</div>
        </SidebarMenu>
      ) : (
        <SidebarLink
          to={item.path}
          onClick={closeSidebar}
          isCurrentPage={isCurrentPage}
        >
          <div>
            {item.icon}
            <SidebarLabel>{item.title}</SidebarLabel>
          </div>
          <div>{item.subNav && subnav ? item.iconOpened : item.iconClosed}</div>
        </SidebarLink>
      )}
      {subnav &&
        item.subNav.map((subItem, index) => {
          const isSubCurrentPage = subItem.path === window.location.pathname;
          return (
            <DropdownLink
              to={subItem.path}
              target={subItem.target}
              key={index}
              onClick={closeSidebar}
              isCurrentPage={isSubCurrentPage}
            >
              {subItem.icon}
              <SidebarLabel>{subItem.title}</SidebarLabel>
            </DropdownLink>
          );
        })}
    </>
  );
};

export default SubMenu;
