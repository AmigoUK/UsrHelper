import { render } from 'preact';
import '@/assets/ui.css';
import { RecorderApp } from './RecorderApp';

render(<RecorderApp />, document.getElementById('app')!);
