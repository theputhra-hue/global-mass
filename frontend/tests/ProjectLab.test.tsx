import { fireEvent, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { ProjectLab } from '../src/components/ProjectLab';
import { jsonResponse, mockApi, renderWithClient } from './helpers';

describe('Project Lab',()=>{
  it('discloses controls and offline mode, shows the returned result and passes original texts into investigation',async()=>{
    const investigate=vi.fn();
    mockApi(()=>jsonResponse({total:12,passed:12,lexical_baseline_passed:9,research_gold:false,algorithm_version:'test-v1',dataset_sha256:'abc',warning:'Authored controls, not research accuracy.',runtime_mode:'offline_preview',items:[{id:'distance',title:'Equivalent distance',group:'Controls',older_text:'The road is 1 km long.',newer_text:'The road is 1000 m long.',expected_change:false,passed:true,lexical_baseline_change:true,analysis:{relation_category:'EQUIVALENT_QUANTITY',relation_explanation:'Quantities match.',mutation_types:['NEAR_DUPLICATE']}}]}));
    renderWithClient(<ProjectLab navigate={vi.fn()} investigate={investigate}/>);
    expect(await screen.findByText(/the engineering controls run the real text-change engine/)).toBeTruthy();
    expect(screen.getByText('Quantities match.')).toBeTruthy();
    expect(screen.getByText(/Natural-news accuracy requires/)).toBeTruthy();
    fireEvent.click(screen.getByRole('button',{name:/Investigate this pair/}));
    expect(investigate).toHaveBeenCalledWith({older_text:'The road is 1 km long.',newer_text:'The road is 1000 m long.'});
  });
  it('reports API failure instead of inventing scores',async()=>{
    mockApi(()=>jsonResponse({detail:'unavailable'},503));
    renderWithClient(<ProjectLab navigate={vi.fn()} investigate={vi.fn()}/>);
    expect(await screen.findByText('Project controls unavailable')).toBeTruthy();
    expect(screen.queryByText(/12/)).toBeNull();
  });
});
