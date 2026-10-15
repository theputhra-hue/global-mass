import { render } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { TextSpans } from '../src/components/TextSpans';
import { returnedSpans } from '../src/lib/textSpans';

describe('Original text span highlighting',()=>{
  it('uses Unicode code points, merges overlap and preserves source text',()=>{
    const text='🚀 found 12 people';
    const {container}=render(<TextSpans text={text} spans={[{start:8,end:10},{start:9,end:10},{start:-1,end:4},{start:50,end:60}]}/>);
    expect(container.textContent).toBe(text);
    expect(container.querySelectorAll('mark')).toHaveLength(1);
    expect(container.querySelector('mark')?.textContent).toBe('12');
  });
  it('ignores malformed/empty ranges without inserting markup from text',()=>{
    const text='<img src=x onerror=attack()>';
    const spans=returnedSpans({changed_spans:[null,{}, {older_span:{start:0,end:'4'}},{older_span:{start:0,end:0}}]},'older');
    const {container}=render(<TextSpans text={text} spans={spans}/>);
    expect(container.textContent).toBe(text);
    expect(container.querySelector('img')).toBeNull();expect(container.querySelector('mark')).toBeNull();
  });
});
