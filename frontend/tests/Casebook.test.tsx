import { fireEvent, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { Casebook } from '../src/features/investigations/components/Casebook';
import { caseMarkdown } from '../src/features/investigations/lib/caseExport';
import type { CaseDetail } from '../src/shared/api/casebook';
import { jsonResponse, mockApi, renderWithClient, signInFixture } from './helpers';

const saved: CaseDetail={id:'case-one',title:'Bridge case',notes:'Saved note',status:'open',revision:1,created_at:'2026-10-15T00:00:00Z',updated_at:'2026-10-15T00:00:00Z',snapshot_sha256:'a'.repeat(64),snapshot:{schema_version:'gmee-case-v1',captured_at:'2026-10-15T00:00:00Z',inputs:{older_text:'10 survivors',newer_text:'12 survivors'},analysis:{mutation_types:['NUMERIC_DRIFT'],algorithm_version:'v2',relation_explanation:'Changed number'},interpretation:'Text changes only, not truth.'}};
describe('Private casebook',()=>{
  it('does not fetch private cases without an account',()=>{
    const fetch=mockApi(()=>jsonResponse({}));
    renderWithClient(<Casebook/>);
    expect(screen.getByText(/Sign in to use your private casebook/)).toBeTruthy();
    expect(fetch).not.toHaveBeenCalled();
  });
  it('captures server analysis, opens a snapshot and handles a stale review conflict',async()=>{
    signInFixture();
    const calls: unknown[]=[];
    mockApi((endpoint,init)=>{
      if(endpoint==='/casebook'&&init?.method==='POST'){calls.push(JSON.parse(String(init.body)));return jsonResponse(saved,201);}
      if(endpoint==='/casebook/case-one/review') return jsonResponse({detail:'This case changed in another window. Reload before saving your notes.'},409);
      if(endpoint==='/casebook/case-one') return jsonResponse(saved);
      return jsonResponse({items:[],total:0});
    });
    renderWithClient(<Casebook initialComparison={{older_text:'10 survivors',newer_text:'12 survivors'}}/>);
    fireEvent.change(screen.getByLabelText('Case title'),{target:{value:'Bridge case'}});
    fireEvent.click(screen.getByRole('button',{name:/Capture & save case/}));
    expect(await screen.findByText(/Case captured/)).toBeTruthy();
    expect(calls[0]).toEqual({title:'Bridge case',notes:'',comparison:{older_text:'10 survivors',newer_text:'12 survivors'}});
    fireEvent.change(screen.getByLabelText('Analyst review notes'),{target:{value:'Edited'}});
    fireEvent.click(screen.getByRole('button',{name:'Save review'}));
    expect(await screen.findByText(/This case changed in another window/)).toBeTruthy();
    expect(screen.getByRole('button',{name:'Reload saved case'})).toBeTruthy();
  });
  it('exports saved notes, raw inputs, method and original snapshot fingerprint',()=>{
    const md=caseMarkdown(saved);
    expect(md).toContain('10 survivors'); expect(md).toContain('Saved note'); expect(md).toContain('Method: v2'); expect(md).toContain(saved.snapshot_sha256);expect(md).toContain('not proof of factual correctness');
  });
});
