import { ROUTINE_TEMPLATES, getTemplateById } from '../../../src/features/routines/routineTemplates';

describe('Routine Templates (F6)', () => {
  it('defines preset templates with non-empty steps', () => {
    expect(ROUTINE_TEMPLATES.length).toBeGreaterThan(0);
    ROUTINE_TEMPLATES.forEach(template => {
      expect(template.id).toBeTruthy();
      expect(template.name).toBeTruthy();
      expect(template.steps.length).toBeGreaterThan(0);
      template.steps.forEach(step => {
        expect(step.title).toBeTruthy();
        expect(step.minutes).toBeGreaterThan(0);
      });
    });
  });

  it('retrieves template by ID correctly', () => {
    const morning = getTemplateById('morning');
    expect(morning).toBeDefined();
    expect(morning?.name).toBe('Morning Routine');

    const invalid = getTemplateById('unknown');
    expect(invalid).toBeUndefined();
  });
});