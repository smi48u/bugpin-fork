import { ChevronDown } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '../ui/collapsible';
import type { Report, SelectedElement } from '@shared/types';

function Requirement({ label, value }: { label: string; value?: string }) {
  if (!value?.trim()) return null;
  return (
    <div className="space-y-1">
      <dt className="text-sm font-medium text-muted-foreground">{label}</dt>
      <dd className="whitespace-pre-wrap text-sm">{value}</dd>
    </div>
  );
}

function SelectedElementDetails({ element }: { element: SelectedElement }) {
  const hasElementData = Object.values(element).some(
    (value) => value !== undefined && value !== ''
  );
  if (!hasElementData) return null;
  const rect = element.rect;

  return (
    <div className="space-y-3 rounded-lg border bg-muted/20 p-4">
      <h3 className="text-sm font-semibold">Selected element</h3>
      <dl className="grid grid-cols-1 gap-x-6 gap-y-2 text-sm sm:grid-cols-2">
        {element.selector && <Info label="Selector" value={element.selector} mono />}
        {element.tagName && <Info label="Tag" value={element.tagName} mono />}
        {element.id && <Info label="ID" value={element.id} mono />}
        {element.componentHint && <Info label="Component" value={element.componentHint} mono />}
        {element.area && <Info label="Area" value={element.area} mono />}
        {element.owner && <Info label="Owner" value={element.owner} mono />}
        {element.screen && <Info label="Screen" value={element.screen} mono />}
        {element.activeTab && <Info label="Active tab" value={element.activeTab} mono />}
        {element.classes?.length ? (
          <Info label="Classes" value={element.classes.join(' ')} mono />
        ) : null}
        {element.text && <Info label="Text" value={element.text} />}
        {rect && (
          <Info
            label="Rect"
            value={`${rect.x ?? 0}, ${rect.y ?? 0} · ${rect.width ?? 0} × ${rect.height ?? 0}`}
            mono
          />
        )}
      </dl>
      {element.html && (
        <Collapsible>
          <CollapsibleTrigger className="flex items-center gap-2 text-sm font-medium hover:underline">
            HTML snapshot
            <ChevronDown className="h-4 w-4 transition-transform [[data-state=open]_&]:rotate-180" />
          </CollapsibleTrigger>
          <CollapsibleContent>
            <pre className="mt-2 max-h-64 overflow-auto whitespace-pre-wrap break-all rounded-md bg-muted p-3 text-xs">
              {element.html}
            </pre>
          </CollapsibleContent>
        </Collapsible>
      )}
    </div>
  );
}

function Info({ label, value, mono = false }: { label: string; value: string; mono?: boolean }) {
  return (
    <div className="min-w-0">
      <dt className="text-muted-foreground">{label}</dt>
      <dd className={`${mono ? 'font-mono' : ''} break-all`}>{value}</dd>
    </div>
  );
}

export function ReportRequirements({ report }: { report: Report }) {
  const type = report.type?.trim() || 'bug';

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          Report intent
          <span className="rounded-full bg-muted px-2 py-0.5 text-xs font-normal uppercase tracking-wide">
            {type}
          </span>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-5">
        <dl className="space-y-4">
          <Requirement label="Requested change" value={report.requestedChange} />
          <Requirement label="Expected result" value={report.expectedResult} />
          <Requirement label="Acceptance criteria" value={report.acceptanceCriteria} />
        </dl>
        {report.selectedElement && <SelectedElementDetails element={report.selectedElement} />}
      </CardContent>
    </Card>
  );
}
