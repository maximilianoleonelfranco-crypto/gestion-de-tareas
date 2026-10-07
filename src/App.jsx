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
    { id: 'offers', label: 'Ofertas', icon: Tags },
    { id: 'schedule', label: 'Agenda', icon: CalendarDays }
  ];

  return (
    <div className="flex flex-col md:flex-row h-screen bg-slate-50 font-sans text-slate-800 overflow-hidden w-full">
      {/* Desktop Sidebar */}
      <aside className="hidden md:flex w-64 bg-white/80 backdrop-blur-md border-r border-slate-200/60 shadow-sm flex-col z-20 transition-all duration-300">
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
      </aside>

      {/* Main Content Area */}
      <main className="flex-1 overflow-y-auto overflow-x-hidden bg-slate-50 relative pb-20 md:pb-0">
        {/* Subtle background decoration */}
        <div className="absolute top-0 left-0 right-0 h-64 bg-gradient-to-b from-slate-200/30 to-transparent pointer-events-none -z-10" />
        
        {/* Mobile Header */}
        <header className="md:hidden flex items-center justify-center h-16 bg-white/80 backdrop-blur-md border-b border-slate-200/60 sticky top-0 z-20">
          <div className="w-8 h-8 bg-gradient-to-tr from-indigo-500 to-indigo-600 rounded-lg flex items-center justify-center text-white font-bold shadow-sm shadow-indigo-200 mr-2 text-sm">
            GP
          </div>
          <h1 className="font-bold text-lg tracking-tight text-slate-800">
            Gestión Proveedores
          </h1>
        </header>

        <div className="p-4 md:p-8 max-w-7xl mx-auto w-full">
          {currentTab === 'tasks' && <Tasks />}
          {currentTab === 'suppliers' && <Suppliers />}
          {currentTab === 'offers' && <Offers />}
          {currentTab === 'schedule' && <Schedule />}
        </div>
      </main>

      {/* Mobile Bottom Navigation */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-white/90 backdrop-blur-md border-t border-slate-200/60 z-30 flex justify-around items-center h-16 px-2 safe-area-pb shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.05)]">
        {tabs.map(tab => {
          const Icon = tab.icon;
          const active = currentTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setCurrentTab(tab.id)}
              className={`flex flex-col items-center justify-center w-full h-full gap-1 transition-colors duration-200 ${
                active ? 'text-indigo-600' : 'text-slate-400 hover:text-slate-600'
              }`}
            >
              <Icon size={20} className={active ? 'scale-110 transition-transform' : ''} />
              <span className="text-[10px] font-semibold">{tab.label}</span>
            </button>
          );
        })}
      </nav>
    </div>
  );
}
