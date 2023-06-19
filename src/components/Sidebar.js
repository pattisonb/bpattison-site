import React, { useState } from 'react';
import styled from 'styled-components';
import { Link, useLocation } from 'react-router-dom';
import * as FaIcons from 'react-icons/fa';
import * as AiIcons from 'react-icons/ai';
import { SidebarData } from './SidebarData';
import SubMenu from './SubMenu';
import { IconContext } from 'react-icons/lib';

const Nav = styled.div`
  background: #15171c;
  height: 80px;
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 0 20px;
  width: 100%; /* Add this line to make the top bar fill the width */
  position: fixed; /* Add this line to fix the position of the top bar */
  top: 0; /* Add this line to position the top bar at the top of the screen */
  left: 0; /* Add this line to align the top bar to the left edge */
  z-index: 999; /* Add this line to ensure the top bar appears above other content */
`;

const NavIcon = styled(Link)`
  font-size: 2rem;
  height: 80px;
  display: flex;
  justify-content: center;
  align-items: center;
  color: #fff;
  text-decoration: none;
`;

const SidebarNav = styled.nav`
  background: #15171c;
  width: 250px;
  height: 100vh;
  display: flex;
  flex-direction: column;
  justify-content: flex-start;
  position: fixed;
  top: 0;
  left: ${({ sidebar }) => (sidebar ? '0' : '-100%')};
  transition: 350ms;
  z-index: 10;

  @media screen and (max-width: 768px) {
    width: 100%;
    left: ${({ sidebar }) => (sidebar ? '0' : '-100%')};
  }
`;

const SidebarWrap = styled.div`
  margin-top: 80px;
`;

const SidebarLabel = styled.span`
  margin-left: 16px;
  color: #fff;
  text-decoration: none;
  cursor: pointer;
`;

const CloseIcon = styled(AiIcons.AiOutlineClose)`
  position: absolute;
  top: 20px;
  left: 20px;
  font-size: 2rem;
  color: #fff;
  cursor: pointer;

  &:hover {
    color: red;
  }
`;

const Indicator = styled.span`
  position: absolute;
  top: 50%;
  right: 20px;
  transform: translateY(-50%);
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background-color: #632ce4;
`;

const Sidebar = () => {
  const [sidebar, setSidebar] = useState(false);
  const location = useLocation();

  const showSidebar = () => setSidebar(!sidebar);

  const closeSidebar = () => setSidebar(false);

  return (
    <>
      <IconContext.Provider value={{ color: '#fff' }}>
        <Nav>
          <NavIcon to='#'>
            <FaIcons.FaBars onClick={showSidebar} />
          </NavIcon>
          <NavIcon to='/' onClick={closeSidebar}>
            <SidebarLabel>Brian Pattison</SidebarLabel>
          </NavIcon>
        </Nav>
        <SidebarNav sidebar={sidebar}>
          <CloseIcon onClick={showSidebar} />
          <SidebarWrap>
            {SidebarData.map((item, index) => {
              const isCurrentPage = item.path === location.pathname;
              return (
                <SubMenu
                  item={item}
                  key={index}
                  closeSidebar={closeSidebar}
                  isCurrentPage={isCurrentPage}
                />
              );
            })}
          </SidebarWrap>
        </SidebarNav>
      </IconContext.Provider>
    </>
  );
};

export default Sidebar;
