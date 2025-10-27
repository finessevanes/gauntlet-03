import React from "react";
import "./ErrorDialog.css";

interface ErrorDialogProps {
  title: string;
  message: string;
  onClose: () => void;
}

export const ErrorDialog: React.FC<ErrorDialogProps> = ({
  title,
  message,
  onClose,
}) => {
  return (
    <div className="error-dialog-overlay">
      <div className="error-dialog">
        <div className="error-dialog-header">
          <h2>{title}</h2>
        </div>
        <div className="error-dialog-body">
          <p>{message}</p>
        </div>
        <div className="error-dialog-footer">
          <button className="error-dialog-button" onClick={onClose}>
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
