import { Download } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

const TEMPLATE_HEADERS = [
  'NOME_DA_PESSOA_CADASTRADA',
  'N_CNS_DA_PESSOA_CADASTRADA',
  'NOME_DA_MAE_PESSOA_CADASTRADA',
  'NOME_UNIDADE_DE_SAUDE',
  'NOME_EQUIPE_DE_SAUDE',
  'CODIGO_MICROAREA',
  'SITUACAO_USUARIO',
  'SEXO',
  'RACA_COR',
  'DATA_DE_NASCIMENTO',
  'IDADE',
] as const;

function buildTemplateCsv(): string {
  const rows = [
    TEMPLATE_HEADERS.join(';'),
    'Maria Aparecida da Silva;700123456789012;Aparecida da Silva;UBS Jardim América;ESF 01;01;Ativo;Feminino;Parda;2014-04-18;12',
    'João Pedro Santos;700987654321098;Maria dos Santos;UBS Vila Nova;ESF 03;03;Ativo;Masculino;Branca;2013-09-02;13',
  ];

  return `\uFEFF${rows.join('\r\n')}`;
}

export function TemplateDownloadCard(): React.JSX.Element {
  const handleDownload = (): void => {
    const blob = new Blob([buildTemplateCsv()], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement('a');

    anchor.href = url;
    anchor.download = 'modelo_importacao_pacientes.csv';
    anchor.click();

    URL.revokeObjectURL(url);
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-primary">Modelo de arquivo CSV</CardTitle>
        <CardDescription>
          Use este modelo como referência. Os cabeçalhos devem incluir pelo menos a coluna{' '}
          <code className="rounded bg-muted px-1 py-0.5 text-xs">NOME_DA_PESSOA_CADASTRADA</code>{' '}
          (ou <code className="rounded bg-muted px-1 py-0.5 text-xs">NOME</code>). Datas aceitas:{' '}
          <strong>yyyy-MM-dd</strong> ou <strong>dd/MM/yyyy</strong>.
        </CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        <ul className="flex flex-col gap-1.5 text-sm text-muted-foreground">
          {TEMPLATE_HEADERS.map((header) => (
            <li key={header} className="flex items-center gap-2">
              <span className="h-1 w-1 rounded-full bg-primary" aria-hidden="true" />
              <code className="text-xs">{header}</code>
            </li>
          ))}
        </ul>
        <div>
          <Button type="button" variant="outline" onClick={handleDownload}>
            <Download className="h-4 w-4" aria-hidden="true" />
            Baixar modelo CSV
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
