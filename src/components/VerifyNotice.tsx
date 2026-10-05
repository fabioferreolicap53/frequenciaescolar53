import { useEffect, useState } from 'react';
import { CheckCircle2, TriangleAlert, X } from 'lucide-react';

interface Notice {
  readonly tone: 'success' | 'error';
  readonly text: string;
}

function readNotice(): Notice | null {
  const params = new URLSearchParams(window.location.search);

  if (params.get('verified') === '1') {
    return {
      tone: 'success',
      text: 'E-mail confirmado com sucesso! Sua conta está ativada — já pode entrar no sistema.',
    };
  }

  if (params.has('verify_error')) {
    return {
      tone: 'error',
      text: 'Não foi possível confirmar o e-mail. O link pode ter expirado — faça login e solicite um novo.',
    };
  }

  return null;
}

/**
 * Aviso flutuante do fluxo de verificação de e-mail.
 * Captura `?verified=1` / `?verify_error=` deixados pelo script inline do
 * `index.html` após confirmar o link recebido por e-mail, exibe o resultado
 * e então limpa a URL.
 */
export function VerifyNotice(): React.JSX.Element | null {
  const [notice] = useState<Notice | null>(readNotice);
  const [visible, setVisible] = useState(true);

  useEffect(() => {
    if (notice === null) {
      return;
    }

    const params = new URLSearchParams(window.location.search);
    if (params.has('verified') || params.has('verify_error')) {
      window.history.replaceState(null, '', window.location.pathname);
    }

    const timer = window.setTimeout(() => setVisible(false), 10_000);
    return () => window.clearTimeout(timer);
  }, [notice]);

  if (notice === null || !visible) {
    return null;
  }

  const success = notice.tone === 'success';
  const Icon = success ? CheckCircle2 : TriangleAlert;

  return (
    <div
      role="status"
      className={`fixed left-1/2 top-4 z-[100] flex w-[calc(100%-2rem)] max-w-lg -translate-x-1/2 items-start gap-3 rounded-xl border px-4 py-3 shadow-lg backdrop-blur ${
        success
          ? 'border-emerald-500/30 bg-emerald-50/95 text-emerald-900'
          : 'border-amber-500/40 bg-amber-50/95 text-amber-900'
      }`}
    >
      <Icon className="mt-0.5 h-5 w-5 shrink-0" aria-hidden="true" />
      <p className="flex-1 text-sm font-medium">{notice.text}</p>
      <button
        type="button"
        onClick={() => setVisible(false)}
        aria-label="Fechar aviso"
        className="rounded-md p-1 transition-colors hover:bg-black/5"
      >
        <X className="h-4 w-4" aria-hidden="true" />
      </button>
    </div>
  );
}
