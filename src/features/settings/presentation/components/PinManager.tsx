import { useState } from "react";
import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router-dom";
import { KeyRound, ShieldAlert, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { PasswordInput } from "@/components/ui/password-input";
import { Label } from "@/components/ui/label";
import { BaseModal } from "@/components/common/BaseModal";
import { useKeyStore } from "@/store/useKeyStore";
import { invoke } from "@tauri-apps/api/core";
import { toast } from "sonner";

export const PinManager = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { status, loadKeys } = useKeyStore();
  const [isOpen, setIsOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  
  const [oldPin, setOldPin] = useState("");
  const [newPin, setNewPin] = useState("");
  const [confirmPin, setConfirmPin] = useState("");
  const [error, setError] = useState("");

  if (status === 'uninitialized') {
    return (
      <div className="flex flex-col items-end gap-2">
        <span className="text-[0.95rem] text-amber-500 dark:text-amber-400 font-medium flex items-center gap-1.5">
          <ShieldAlert className="w-4 h-4" />
          {t('settings.security.uninitializedWarning', 'Master PIN not initialized')}
        </span>
        <Button 
          variant="outline" 
          size="sm" 
          onClick={() => navigate('/keys')}
          className="text-[0.95rem] h-9"
        >
          {t('settings.security.goToKeys', 'Go to Key Management')}
        </Button>
      </div>
    );
  }

  const handleOpen = () => {
    setOldPin("");
    setNewPin("");
    setConfirmPin("");
    setError("");
    setIsOpen(true);
  };

  const handleClose = () => {
    if (isLoading) return;
    setIsOpen(false);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    // Validation
    if (newPin.length < 6) {
      setError(t('settings.security.pinLengthError', 'PIN must be at least 6 characters'));
      return;
    }

    if (newPin !== confirmPin) {
      setError(t('settings.security.pinMismatchError', 'New PINs do not match'));
      return;
    }

    setIsLoading(true);

    try {
      await invoke("change_vault_password", {
        oldPassword: oldPin,
        newPassword: newPin
      });

      // Update Zustand store
      useKeyStore.setState({
        status: 'unlocked',
        encryptionKey: newPin
      });

      // Reload keys
      await loadKeys();

      toast.success(t('settings.security.changeSuccess', 'Master PIN changed successfully'));
      setIsOpen(false);
    } catch (err: any) {
      console.error("Failed to change PIN", err);
      const errMsg = String(err);
      if (errMsg.includes("INVALID_OLD_PASSWORD")) {
        setError(t('settings.security.oldPinIncorrect', 'Current PIN is incorrect'));
      } else {
        setError(t('settings.security.changeFailed', 'Failed to change PIN') + `: ${errMsg}`);
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <>
      <Button 
        variant="outline" 
        size="sm" 
        onClick={handleOpen}
        className="text-[0.95rem] h-9"
      >
        <KeyRound className="w-4 h-4 mr-2" />
        {t('settings.security.changePin', 'Change PIN')}
      </Button>

      <BaseModal
        isOpen={isOpen}
        onClose={handleClose}
        title={t('settings.security.changePin', 'Change PIN')}
        icon={<KeyRound className="w-5 h-5" />}
        className="max-w-md"
      >
        <form onSubmit={handleSubmit} className="space-y-4 py-2">
          <div className="space-y-1.5">
            <Label htmlFor="old-pin" className="text-[0.95rem] font-medium text-slate-700 dark:text-slate-300">
              {t('settings.security.oldPin', 'Current PIN')}
            </Label>
            <PasswordInput
              id="old-pin"
              value={oldPin}
              onChange={(e) => setOldPin(e.target.value)}
              disabled={isLoading}
              required
              placeholder={t('keys.placeholder.enterPwd', 'Enter PIN')}
              maxLength={20}
              className="text-[0.95rem] h-10"
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="new-pin" className="text-[0.95rem] font-medium text-slate-700 dark:text-slate-300">
              {t('settings.security.newPin', 'New PIN')}
            </Label>
            <PasswordInput
              id="new-pin"
              value={newPin}
              onChange={(e) => setNewPin(e.target.value)}
              disabled={isLoading}
              required
              placeholder={t('keys.placeholder.setPwd', 'Set PIN')}
              maxLength={20}
              className="text-[0.95rem] h-10"
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="confirm-pin" className="text-[0.95rem] font-medium text-slate-700 dark:text-slate-300">
              {t('settings.security.confirmPin', 'Confirm New PIN')}
            </Label>
            <PasswordInput
              id="confirm-pin"
              value={confirmPin}
              onChange={(e) => setConfirmPin(e.target.value)}
              disabled={isLoading}
              required
              placeholder={t('keys.placeholder.confirmPwd', 'Confirm PIN')}
              maxLength={20}
              className="text-[0.95rem] h-10"
            />
          </div>

          {error && (
            <div className="text-red-500 dark:text-red-400 text-sm font-medium pt-1">
              {error}
            </div>
          )}

          <div className="flex gap-3 pt-3">
            <Button
              type="button"
              variant="outline"
              onClick={handleClose}
              disabled={isLoading}
              className="flex-1 text-[0.95rem] h-10"
            >
              {t('common.cancel', 'Cancel')}
            </Button>

            <Button
              type="submit"
              disabled={isLoading || !oldPin || !newPin || !confirmPin}
              className="flex-1 text-[0.95rem] h-10 bg-blue-600 hover:bg-blue-700 text-white font-medium flex items-center justify-center gap-2"
            >
              {isLoading ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                t('common.confirm', 'Confirm')
              )}
            </Button>
          </div>
        </form>
      </BaseModal>
    </>
  );
};
