import React, { useState, useEffect } from 'react';

const ConfirmDialog = () => {
  const [isVisible, setIsVisible] = useState(false);
  const [message, setMessage] = useState('');
  const [resolvePromise, setResolvePromise] = useState(null);

  useEffect(() => {
    // Make confirmDialog available globally
    window.confirmDialog = (msg) => {
      return new Promise((resolve) => {
        setMessage(msg);
        setIsVisible(true);
        setResolvePromise(() => resolve);
      });
    };

    // Cleanup on unmount
    return () => {
      delete window.confirmDialog;
    };
  }, []);

  const handleConfirm = () => {
    setIsVisible(false);
    if (resolvePromise) {
      resolvePromise(true);
    }
  };

  const handleCancel = () => {
    setIsVisible(false);
    if (resolvePromise) {
      resolvePromise(false);
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Escape') {
      handleCancel();
    } else if (e.key === 'Enter') {
      handleConfirm();
    }
  };

  if (!isVisible) return null;

  const styles = {
    overlay: {
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      backgroundColor: 'rgba(0, 0, 0, 0.5)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 1000,
    },
    dialog: {
      background: 'white',
      borderRadius: '12px',
      padding: '24px',
      maxWidth: '400px',
      width: '90%',
      boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)',
      animation: 'dialogFadeIn 0.2s ease-out',
    },
    message: {
      fontSize: '16px',
      lineHeight: '1.5',
      color: '#374151',
      marginBottom: '24px',
    },
    buttons: {
      display: 'flex',
      gap: '12px',
      justifyContent: 'flex-end',
    },
    button: {
      padding: '8px 16px',
      borderRadius: '6px',
      fontSize: '14px',
      fontWeight: '500',
      cursor: 'pointer',
      border: 'none',
      transition: 'all 0.2s',
    },
    cancelButton: {
      backgroundColor: '#f3f4f6',
      color: '#374151',
      border: '1px solid #d1d5db',
    },
    confirmButton: {
      backgroundColor: '#dc2626',
      color: 'white',
    },
  };

  return (
    <div style={styles.overlay} onClick={handleCancel} onKeyDown={handleKeyDown} tabIndex={-1}>
      <div style={styles.dialog} onClick={(e) => e.stopPropagation()}>
        <div style={styles.message}>{message}</div>
        <div style={styles.buttons}>
          <button
            style={{...styles.button, ...styles.cancelButton}}
            onClick={handleCancel}
            autoFocus
          >
            Cancel
          </button>
          <button
            style={{...styles.button, ...styles.confirmButton}}
            onClick={handleConfirm}
          >
            Confirm
          </button>
        </div>
      </div>
    </div>
  );
};

export default ConfirmDialog;