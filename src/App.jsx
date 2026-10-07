import { useState } from 'react';
import { ClipboardList, Users, Tags, CalendarDays } from 'lucide-react';
import Tasks from './components/Tasks';
import Suppliers from './components/Suppliers';
import Offers from './components/Offers';
import Schedule from './components/Schedule';

export default function App() {
  const [currentTab, setCurrentTab] = useState('tasks');

  const tabs = [
    { id: 'tasks', label: 'Pendientes', icon: ClipboardList },
    { id: 'suppliers', label: 'Maestro Proveedores', icon: Users },
    { id: 'offers', label: 'Ofertas y Artículos', icon: Tags },
    { id: 'schedule', label: 'Agenda', icon: CalendarDays }
  ];

  return (
    <div className="min-h-screen bg-slate-50 font-sans text-slate-800">
      {/* Navigation */}
      <header className="bg-white border-b border-slate-200 sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-indigo-600 rounded flex items-center justify-center text-white font-bold">
              GP
            </div>
            <h1 className="font-bold text-xl tracking-tight text-slate-800">Gestión de Proveedores</h1>
          </div>
          <nav className="flex gap-1">
            {tabs.map(tab => {
              const Icon = tab.icon;
              const active = currentTab === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => setCurrentTab(tab.id)}
                  className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                    active ? 'bg-indigo-50 text-indigo-700' : 'text-slate-600 hover:bg-slate-100'
                  }`}
                >
                  <Icon size={18} />
                  <span className="hidden md:inline">{tab.label}</span>
                </button>
              );
            })}
          </nav>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="py-8">
        {currentTab === 'tasks' && <Tasks />}
        {currentTab === 'suppliers' && <Suppliers />}
        {currentTab === 'offers' && <Offers />}
        {currentTab === 'schedule' && <Schedule />}
      </main>
    </div>
  );
}
