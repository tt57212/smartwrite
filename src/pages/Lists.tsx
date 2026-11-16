import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { del, get, patch, post } from '../lib/api';
import type { ListItem, WordList } from '../lib/types';
import { Badge, Button, Card, ErrorBox, Input, Modal, Select, Spinner, Textarea } from '../components/ui';

export function Lists() {
  const [lists, setLists] = useState<WordList[]>([]);
  const [selected, setSelected] = useState<WordList | null>(null);
  const [items, setItems] = useState<ListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showNew, setShowNew] = useState(false);
  const [showAdd, setShowAdd] = useState(false);

  const load = () => {
    get<{ lists: WordList[] }>('/lists').then((d) => setLists(d.lists)).catch((e) => setError(e.message)).finally(() => setLoading(false));
  };
  useEffect(load, []);

  const openList = async (l: WordList) => {
    setSelected(l);
    const d = await get<{ list: WordList; items: ListItem[] }>(`/lists/${l.id}`);
    setItems(d.items);
  };

  const createList = async (name: string, difficulty: string) => {
    await post('/lists', { name, difficulty: difficulty || undefined });
    setShowNew(false); load();
  };

  const addItems = async (texts: string, type: string, difficulty: string) => {
    if (!selected) return;
    const lines = texts.split('\n').map((t) => t.trim()).filter(Boolean);
    await post(`/lists/${selected.id}/items`, {
      items: lines.map((text) => ({ type, text, difficulty: difficulty || undefined })),
    });
    setShowAdd(false);
    await openList(selected);
    load();
  };

  const removeList = async (l: WordList) => {
    if (!confirm(`Liste „${l.name}“ löschen?`)) return;
    await del(`/lists/${l.id}`);
    if (selected?.id === l.id) { setSelected(null); setItems([]); }
    load();
  };

  const removeItem = async (itemId: number) => {
    if (!selected) return;
    await del(`/lists/${selected.id}/items/${itemId}`);
    await openList(selected);
  };

  if (loading) return <div className="flex justify-center py-20"><Spinner className="h-8 w-8" /></div>;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-extrabold">Meine Listen</h1>
          <p className="text-sm text-slate-500 dark:text-slate-400">Eigene Wörter, Sätze und Texte für dein Training.</p>
        </div>
        <Button onClick={() => setShowNew(true)}>＋ Neue Liste</Button>
      </div>
      {error && <ErrorBox message={error} />}

      <div className="grid gap-6 lg:grid-cols-5">
        {/* Listen-Übersicht */}
        <div className="space-y-3 lg:col-span-2">
          {lists.length === 0 && (
            <Card className="p-8 text-center text-sm text-slate-500">
              Noch keine Listen. Erstelle eine, um eigene Wörter zu üben.
            </Card>
          )}
          {lists.map((l) => (
            <Card key={l.id} className={`cursor-pointer p-4 transition hover:border-indigo-300 dark:hover:border-indigo-500/40 ${selected?.id === l.id ? 'border-indigo-500 ring-2 ring-indigo-500/20' : ''}`} onClick={() => void openList(l)}>
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-bold">{l.name}</p>
                  <p className="text-xs text-slate-500">{l.item_count ?? 0} Einträge {l.difficulty ? `· ${l.difficulty}` : ''}</p>
                </div>
                <div className="flex gap-1" onClick={(e) => e.stopPropagation()}>
                  <Link to={`/train?listId=${l.id}`}>
                    <Button variant="secondary" className="px-3 py-1.5 text-xs">Üben</Button>
                  </Link>
                  <Button variant="ghost" className="px-2 py-1.5 text-xs text-red-500" onClick={() => void removeList(l)}>🗑</Button>
                </div>
              </div>
            </Card>
          ))}
        </div>

        {/* Detail */}
        <Card className="p-6 lg:col-span-3">
          {!selected ? (
            <p className="py-10 text-center text-sm text-slate-400">Wähle eine Liste aus, um ihre Einträge zu sehen.</p>
          ) : (
            <>
              <div className="mb-4 flex items-center justify-between">
                <div>
                  <h2 className="font-bold">{selected.name}</h2>
                  <p className="text-xs text-slate-500">{items.length} Einträge</p>
                </div>
                <Button onClick={() => setShowAdd(true)}>＋ Einträge hinzufügen</Button>
              </div>
              <div className="max-h-[28rem] space-y-2 overflow-y-auto pr-1">
                {items.map((i) => (
                  <div key={i.id} className="flex items-center justify-between gap-3 rounded-xl bg-slate-50 px-4 py-2.5 dark:bg-slate-800/60">
                    <div className="flex min-w-0 items-center gap-2">
                      <Badge tone={i.type === 'word' ? 'indigo' : i.type === 'sentence' ? 'violet' : 'amber'}>
                        {i.type === 'word' ? 'Wort' : i.type === 'sentence' ? 'Satz' : 'Text'}
                      </Badge>
                      <span className="truncate text-sm">{i.text}</span>
                    </div>
                    <button onClick={() => void removeItem(i.id)} className="shrink-0 text-slate-400 hover:text-red-500">✕</button>
                  </div>
                ))}
                {!items.length && <p className="py-6 text-center text-sm text-slate-400">Noch keine Einträge – füge welche hinzu.</p>}
              </div>
              <Link to="/train" className="mt-4 block">
                <Button variant="secondary" className="w-full">Mit dieser Liste üben</Button>
              </Link>
            </>
          )}
        </Card>
      </div>

      <NewListModal open={showNew} onClose={() => setShowNew(false)} onCreate={createList} />
      <AddItemsModal open={showAdd} onClose={() => setShowAdd(false)} onAdd={addItems} />
    </div>
  );
}

function NewListModal({ open, onClose, onCreate }: { open: boolean; onClose: () => void; onCreate: (n: string, d: string) => void }) {
  const [name, setName] = useState('');
  const [difficulty, setDifficulty] = useState('');
  return (
    <Modal open={open} onClose={onClose} title="Neue Liste">
      <div className="space-y-4">
        <div>
          <label className="mb-1.5 block text-sm font-medium">Name</label>
          <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="z. B. Vokabeln Klasse 5" autoFocus />
        </div>
        <div>
          <label className="mb-1.5 block text-sm font-medium">Schwierigkeit (optional)</label>
          <Select value={difficulty} onChange={(e) => setDifficulty(e.target.value)}>
            <option value="">Beliebig</option>
            <option value="anfaenger">Anfänger</option>
            <option value="leicht">Leicht</option>
            <option value="mittel">Mittel</option>
            <option value="schwer">Schwer</option>
            <option value="experte">Experte</option>
          </Select>
        </div>
        <div className="flex gap-3">
          <Button variant="secondary" className="flex-1" onClick={onClose}>Abbrechen</Button>
          <Button className="flex-1" disabled={!name.trim()} onClick={() => onCreate(name, difficulty)}>Erstellen</Button>
        </div>
      </div>
    </Modal>
  );
}

function AddItemsModal({ open, onClose, onAdd }: { open: boolean; onClose: () => void; onAdd: (texts: string, type: string, d: string) => void }) {
  const [texts, setTexts] = useState('');
  const [type, setType] = useState('word');
  const [difficulty, setDifficulty] = useState('');
  const count = texts.split('\n').filter((t) => t.trim()).length;
  return (
    <Modal open={open} onClose={onClose} title="Einträge hinzufügen">
      <div className="space-y-4">
        <div>
          <label className="mb-1.5 block text-sm font-medium">Art</label>
          <Select value={type} onChange={(e) => setType(e.target.value)}>
            <option value="word">Wörter</option>
            <option value="sentence">Sätze</option>
            <option value="text">Texte</option>
          </Select>
        </div>
        <div>
          <label className="mb-1.5 block text-sm font-medium">Einträge (einer pro Zeile)</label>
          <Textarea value={texts} onChange={(e) => setTexts(e.target.value)} rows={7} placeholder={'Vater\nMutter\nSchwester'} />
          <p className="mt-1 text-xs text-slate-400">{count} Einträge erkannt</p>
        </div>
        <div>
          <label className="mb-1.5 block text-sm font-medium">Schwierigkeit (optional)</label>
          <Select value={difficulty} onChange={(e) => setDifficulty(e.target.value)}>
            <option value="">Beliebig</option>
            <option value="anfaenger">Anfänger</option>
            <option value="leicht">Leicht</option>
            <option value="mittel">Mittel</option>
            <option value="schwer">Schwer</option>
            <option value="experte">Experte</option>
          </Select>
        </div>
        <div className="flex gap-3">
          <Button variant="secondary" className="flex-1" onClick={onClose}>Abbrechen</Button>
          <Button className="flex-1" disabled={!count} onClick={() => onAdd(texts, type, difficulty)}>Hinzufügen</Button>
        </div>
      </div>
    </Modal>
  );
}
