import { NavLink } from "react-router-dom";

const navItems = [
  { to: "/today", label: "今日任务", icon: "今" },
  { to: "/plan", label: "学习计划", icon: "计" },
  { to: "/library", label: "知识点库", icon: "库" },
  { to: "/stats", label: "进度统计", icon: "统" },
  { to: "/settings", label: "设置", icon: "设" },
];

export function BottomNav() {
  return (
    <nav className="bottom-nav" aria-label="主导航">
      {navItems.map((item) => (
        <NavLink
          key={item.to}
          to={item.to}
          className={({ isActive }) =>
            isActive ? "bottom-nav__item bottom-nav__item--active" : "bottom-nav__item"
          }
        >
          <span className="bottom-nav__icon" aria-hidden="true">
            {item.icon}
          </span>
          <span className="bottom-nav__label">{item.label}</span>
        </NavLink>
      ))}
    </nav>
  );
}
