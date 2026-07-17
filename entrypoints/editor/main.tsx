import { render } from 'preact';
import '@/assets/ui.css';
import './editor.css';
import { EditorApp } from './EditorApp';

render(<EditorApp />, document.getElementById('app')!);
