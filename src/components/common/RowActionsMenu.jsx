import { useState, useRef, useEffect } from "react";
import { MoreVertical } from "lucide-react";

const RowActionsMenu = ({ actions }) => {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false);
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const visibleActions = actions.filter((a) => !a.hidden);
  if (visibleActions.length === 0) return null;

  return (
    <div className="relative inline-block text-left" ref={ref}>
      <button
        onClick={(e) => {
          e.stopPropagation();
          setOpen((o) => !o);
        }}
        className="p-2 text-venus-text-muted hover:text-venus-text-primary hover:bg-venus-bg-tertiary rounded-lg transition-colors"
      >
        <MoreVertical className="w-4 h-4" />
      </button>
      {open && (
        <div className="absolute right-0 mt-1 w-48 bg-venus-bg-secondary border border-venus-border rounded-lg shadow-lg z-20 py-1">
          {visibleActions.map((action, i) => (
            <button
              key={i}
              onClick={(e) => {
                e.stopPropagation();
                setOpen(false);
                action.onClick();
              }}
              className={`w-full flex items-center gap-2 px-4 py-2 text-sm text-left hover:bg-venus-bg-tertiary transition-colors ${
                action.danger ? "text-venus-danger" : "text-venus-text-primary"
              }`}
            >
              {action.icon && <action.icon className="w-4 h-4" />}
              {action.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
};

export default RowActionsMenu;
