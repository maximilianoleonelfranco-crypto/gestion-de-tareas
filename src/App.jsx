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
    { id: 'suppliers', label: 'Proveedores', icon: Users },
    { id: 'offers', label: 'Ofertas y Artículos', icon: Tags },
    { id: 'schedule', label: 'Agenda', icon: CalendarDays }
  ];

  return (
    <div className="flex h-screen bg-slate-50 font-sans text-slate-800 overflow-hidden">
      {/* Elegant Glassmorphism Sidebar */}
      <aside className="w-64 bg-white/80 backdrop-blur-md border-r border-slate-200/60 shadow-sm flex flex-col z-20 transition-all duration-300">
        <div className="h-20 flex items-center px-6 border-b border-slate-100/50">
          <div className="w-10 h-10 bg-gradient-to-tr from-indigo-500 to-indigo-600 rounded-xl flex items-center justify-center text-white font-bold shadow-md shadow-indigo-200">
            GP
          </div>
          <h1 className="ml-3 font-bold text-lg tracking-tight text-slate-800 leading-tight">
            Gestión <br/> Proveedores
          </h1>
        </div>
        
        <nav className="flex-1 px-4 py-6 space-y-2 overflow-y-auto">
          {tabs.map(tab => {
            const Icon = tab.icon;
            const active = currentTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setCurrentTab(tab.id)}
                className={`w-full flex items-center gap-3 px-4 py-3.5 rounded-xl text-sm font-semibold transition-all duration-200 group ${
                  active 
                    ? 'bg-indigo-50 text-indigo-700 shadow-sm ring-1 ring-indigo-100/50' 
                    : 'text-slate-500 hover:bg-slate-100/80 hover:text-slate-800'
                }`}
              >
                <Icon size={20} className={`${active ? 'text-indigo-600' : 'text-slate-400 group-hover:text-slate-600 transition-colors duration-200'}`} />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </nav>
        
        <div className="p-4 border-t border-slate-100/50">
          <div className="bg-slate-100/50 p-4 rounded-xl flex items-center gap-3">
            <div className="w-8 h-8 rounded-full bg-indigo-100 text-indigo-600 flex items-center justify-center font-bold text-xs">
              AD
            </div>
            <div>
              <p className="text-sm font-semibold text-slate-700">Admin</p>
              <p className="text-xs text-slate-500">v2.0 (2026)</p>
            </div>
          </div>
        </div>
      </aside>

      {/* Main Content Area */}
      <main className="flex-1 overflow-y-auto bg-slate-50 relative">
        {/* Subtle background decoration */}
        <div className="absolute top-0 left-0 right-0 h-64 bg-gradient-to-b from-slate-200/30 to-transparent pointer-events-none -z-10" />
        
        <div className="p-8 max-w-7xl mx-auto animate-in fade-in slide-in-from-bottom-4 duration-500 ease-out">
          {currentTab === 'tasks' && <Tasks />}
          {currentTab === 'suppliers' && <Suppliers />}
          {currentTab === 'offers' && <Offers />}
          {currentTab === 'schedule' && <Schedule />}
        </div>
      </main>
    </div>
  );
}
