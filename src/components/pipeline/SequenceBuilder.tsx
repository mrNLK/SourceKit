import { useState } from 'react';
import { Plus, X, Save } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { DEFAULT_TEMPLATES, type SequenceStep } from '@/hooks/useSequences';

interface SequenceBuilderProps {
  onSave: (name: string, steps: SequenceStep[]) => void;
  onCancel: () => void;
}

const SequenceBuilder = ({ onSave, onCancel }: SequenceBuilderProps) => {
  const [name, setName] = useState('');
  const [steps, setSteps] = useState<SequenceStep[]>([
    { subject: '', body: '', delay_days: 0 },
  ]);

  const addStep = () => {
    setSteps([...steps, { subject: '', body: '', delay_days: 3 }]);
  };

  const removeStep = (index: number) => {
    setSteps(steps.filter((_, i) => i !== index));
  };

  const updateStep = (index: number, field: keyof SequenceStep, value: string | number) => {
    setSteps(steps.map((s, i) => i === index ? { ...s, [field]: value } : s));
  };

  const loadTemplate = (template: typeof DEFAULT_TEMPLATES[number]) => {
    setName(template.name);
    setSteps(template.steps);
  };

  return (
    <div className="glass rounded-xl p-5 space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="font-display text-sm font-semibold">Create Sequence</h3>
        <button onClick={onCancel} className="text-muted-foreground hover:text-foreground">
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* Templates */}
      <div className="flex gap-2 flex-wrap">
        <span className="text-[10px] text-muted-foreground font-display self-center">Templates:</span>
        {DEFAULT_TEMPLATES.map((t) => (
          <button
            key={t.name}
            onClick={() => loadTemplate(t)}
            className="text-[10px] font-display px-2 py-1 rounded bg-secondary hover:bg-primary/10 hover:text-primary transition-colors"
          >
            {t.name}
          </button>
        ))}
      </div>

      <Input
        placeholder="Sequence name..."
        value={name}
        onChange={(e) => setName(e.target.value)}
        className="text-sm"
      />

      <div className="space-y-3">
        {steps.map((step, i) => (
          <div key={i} className="glass rounded-lg p-3 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-display font-semibold text-muted-foreground uppercase">
                Step {i + 1} {i === 0 ? '(Immediate)' : `(+${step.delay_days} days)`}
              </span>
              {steps.length > 1 && (
                <button onClick={() => removeStep(i)} className="text-muted-foreground hover:text-destructive">
                  <X className="w-3 h-3" />
                </button>
              )}
            </div>
            {i > 0 && (
              <Input
                type="number"
                min={1}
                value={step.delay_days}
                onChange={(e) => updateStep(i, 'delay_days', parseInt(e.target.value) || 1)}
                className="text-xs w-24"
                placeholder="Delay (days)"
              />
            )}
            <Input
              placeholder="Subject line..."
              value={step.subject}
              onChange={(e) => updateStep(i, 'subject', e.target.value)}
              className="text-xs"
            />
            <Textarea
              placeholder="Email body... Use {{firstName}}, {{name}}, {{username}} for personalization"
              value={step.body}
              onChange={(e) => updateStep(i, 'body', e.target.value)}
              className="text-xs min-h-[80px]"
            />
          </div>
        ))}
      </div>

      <div className="flex items-center gap-2">
        <Button variant="outline" size="sm" onClick={addStep}>
          <Plus className="w-3 h-3 mr-1" /> Add Step
        </Button>
        <div className="flex-1" />
        <Button variant="outline" size="sm" onClick={onCancel}>Cancel</Button>
        <Button
          size="sm"
          onClick={() => onSave(name, steps)}
          disabled={!name.trim() || steps.some(s => !s.subject.trim() || !s.body.trim())}
        >
          <Save className="w-3 h-3 mr-1" /> Save Sequence
        </Button>
      </div>
    </div>
  );
};

export default SequenceBuilder;
