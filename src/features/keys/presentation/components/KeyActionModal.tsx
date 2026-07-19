import { useTranslation } from 'react-i18next';
import { X, Upload, Eye, EyeOff, Save, Loader2, CheckCircle2, AlertTriangle } from 'lucide-react';
import { useKeyForm } from '@/features/keys/application/hooks/useKeyForm';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';

export const KeyActionModal = () => {
  const { t } = useTranslation();

  const {
    isOpen, mode,
    name, setName,
    type,
    content, setContent,
    username, setUsername,
    passphrase, setPassphrase,

    isLoading, isFetchingData,
    showContent, setShowContent,
    showPassphrase, setShowPassphrase,
    isValidKey, keyStatusMsg,

    closeModal,
    handleFileUpload,
    handleSubmit
  } = useKeyForm();

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/50 backdrop-blur-md" onClick={closeModal} />
      <div className="relative w-full max-w-lg bg-card text-card-foreground rounded-xl shadow-2xl border border-border flex flex-col max-h-[90vh] animate-in zoom-in-95 duration-200">

        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-border">
          <h3 className="text-lg font-bold text-foreground">
            {mode === 'add' ? t('keys.action.add', 'Add Credential') : t('keys.action.edit', 'Edit Credential')}
          </h3>
          <Button variant="ghost" size="icon" onClick={closeModal} className="h-8 w-8 text-muted-foreground hover:text-foreground">
            <X className="w-4 h-4" />
          </Button>
        </div>

        {/* Body */}
        {isFetchingData ? (
          <div className="flex-1 flex items-center justify-center p-10">
            <Loader2 className="w-8 h-8 animate-spin text-primary" />
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-6 space-y-5 custom-scrollbar">
            {/* Name & Username */}
            <div className="space-y-4">
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-muted-foreground uppercase">
                  {t('keys.label.remarkName', 'Remark Name')} <span className="text-destructive">*</span>
                </label>
                <Input
                  type="text"
                  value={name}
                  onChange={e => setName(e.target.value)}
                  placeholder={t('keys.placeholder.remarkName', 'e.g. Production Server')}
                  autoFocus
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-muted-foreground uppercase">
                  {t('keys.label.username', 'Username')}
                </label>
                <Input
                  type="text"
                  value={username}
                  onChange={e => setUsername(e.target.value)}
                  placeholder={t('keys.placeholder.username', 'Optional')}
                />
              </div>
            </div>

            <hr className="border-border" />

            {/* Content */}
            <div className="space-y-1.5">
              <div className="flex justify-between items-center">
                <label className="text-xs font-semibold text-muted-foreground uppercase">
                  {type === 'password' ? t('keys.label.password', 'Password') : t('keys.label.privateKey', 'Private Key')} <span className="text-destructive">*</span>
                </label>
                {type === 'private_key' && (
                  <Button
                    type="button"
                    variant="link"
                    size="sm"
                    onClick={handleFileUpload}
                    className="h-auto p-0 text-xs text-primary gap-1"
                  >
                    <Upload className="w-3 h-3" />
                    {t('keys.action.importFile', 'Import File')}
                  </Button>
                )}
              </div>
              <div className="relative">
                {type === 'password' ? (
                  <Input
                    type={showContent ? "text" : "password"}
                    value={content}
                    onChange={e => setContent(e.target.value)}
                    className="font-mono pr-10"
                  />
                ) : (
                  <Textarea
                    value={content}
                    onChange={e => setContent(e.target.value)}
                    rows={6}
                    placeholder={t('keys.placeholder.privateKey', 'Paste your private key here')}
                    className={`font-mono text-xs leading-relaxed resize-none custom-scrollbar whitespace-pre ${!isValidKey && content ? 'border-destructive focus-visible:ring-destructive' : ''}`}
                  />
                )}
                {type === 'password' && (
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    onClick={() => setShowContent(!showContent)}
                    className="absolute right-1 top-1/2 -translate-y-1/2 h-8 w-8 text-muted-foreground hover:text-foreground"
                  >
                    {showContent ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </Button>
                )}
              </div>
              {type === 'private_key' && content && (
                <div className={`text-[10px] flex items-center gap-1 mt-1 ${isValidKey ? 'text-emerald-500' : 'text-destructive'}`}>
                  {isValidKey ? <CheckCircle2 className="w-3 h-3" /> : <AlertTriangle className="w-3 h-3" />}
                  {keyStatusMsg}
                </div>
              )}
            </div>

            {/* Passphrase */}
            {type === 'private_key' && (
              <div className="space-y-1.5 animate-in fade-in slide-in-from-top-2">
                <label className="text-xs font-semibold text-muted-foreground uppercase">
                  {t('keys.label.passphrase', 'Passphrase')}
                </label>
                <div className="relative">
                  <Input
                    type={showPassphrase ? "text" : "password"}
                    value={passphrase}
                    onChange={e => setPassphrase(e.target.value)}
                    placeholder={t('keys.placeholder.passphrase', 'Optional (if key is encrypted)')}
                    className="pr-10"
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    onClick={() => setShowPassphrase(!showPassphrase)}
                    className="absolute right-1 top-1/2 -translate-y-1/2 h-8 w-8 text-muted-foreground hover:text-foreground"
                  >
                    {showPassphrase ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </Button>
                </div>
              </div>
            )}
          </form>
        )}

        {/* Footer */}
        <div className="px-6 py-4 border-t border-border flex justify-end gap-3 bg-muted/20 rounded-b-xl">
          <Button variant="ghost" onClick={closeModal} size="sm">
            {t('common.cancel', 'Cancel')}
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={!name || !content || isLoading || isFetchingData || (type === 'private_key' && !isValidKey)}
            size="sm"
            className="gap-2 px-6"
          >
            {isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
            {t('common.save', 'Save')}
          </Button>
        </div>
      </div>
    </div>
  );
};
