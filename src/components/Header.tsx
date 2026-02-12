import { Orbit, Github, Info } from 'lucide-react';
import { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';

export function Header() {
  const [showHelp, setShowHelp] = useState(false);

  return (
    <header className="absolute top-0 left-0 right-0 z-50 p-6">
      <div className="flex items-center justify-between">
        {/* Logo */}
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center glow-box">
            <Orbit className="w-6 h-6 text-white" />
          </div>
          <div>
            <h1 className="text-white font-bold text-lg glow-text">Solar System</h1>
            <p className="text-white/50 text-xs flex items-center gap-2">
              Interactive 3D Explorer
              {import.meta.env.VITE_APP_VERSION && (
                <span className="text-white/30">v{import.meta.env.VITE_APP_VERSION}</span>
              )}
            </p>
          </div>
        </div>

        {/* Actions */}
        <div className="flex items-center gap-2">
          <Dialog open={showHelp} onOpenChange={setShowHelp}>
            <DialogTrigger asChild>
              <button className="p-2 rounded-lg bg-white/5 border border-white/10 hover:bg-white/10 hover:border-white/30 transition-all text-white/70 hover:text-white">
                <Info className="w-5 h-5" />
              </button>
            </DialogTrigger>
            <DialogContent
              overlayClassName="z-[9999]"
              className="z-[9999] bg-black/90 backdrop-blur-xl border-white/10 text-white max-w-md"
            >
              <DialogHeader>
                <DialogTitle className="text-xl font-bold flex items-center gap-2">
                  <Orbit className="w-5 h-5 text-blue-400" />
                  How to Explore
                </DialogTitle>
              </DialogHeader>
              <div className="space-y-4 text-sm text-white/80">
                <div className="space-y-2">
                  <h4 className="font-semibold text-white flex items-center gap-2">
                    <span className="w-6 h-6 rounded bg-blue-500/20 flex items-center justify-center text-xs">
                      1
                    </span>
                    Navigate
                  </h4>
                  <p className="pl-8 text-white/60">
                    Click and drag to rotate the view. Scroll to zoom in and out. Right-click and
                    drag to pan.
                  </p>
                </div>
                <div className="space-y-2">
                  <h4 className="font-semibold text-white flex items-center gap-2">
                    <span className="w-6 h-6 rounded bg-blue-500/20 flex items-center justify-center text-xs">
                      2
                    </span>
                    Explore Planets
                  </h4>
                  <p className="pl-8 text-white/60">
                    Click on any planet or the Sun to focus on it and see detailed information.
                  </p>
                </div>
                <div className="space-y-2">
                  <h4 className="font-semibold text-white flex items-center gap-2">
                    <span className="w-6 h-6 rounded bg-blue-500/20 flex items-center justify-center text-xs">
                      3
                    </span>
                    Control Time
                  </h4>
                  <p className="pl-8 text-white/60">
                    Use the control panel to pause, adjust speed, and toggle orbit visibility.
                  </p>
                </div>
                <div className="space-y-2">
                  <h4 className="font-semibold text-white flex items-center gap-2">
                    <span className="w-6 h-6 rounded bg-blue-500/20 flex items-center justify-center text-xs">
                      4
                    </span>
                    Follow Mode
                  </h4>
                  <p className="pl-8 text-white/60">
                    Enable "Follow Object" to keep the camera focused on the selected planet,
                    satellite, or moon as it orbits.
                  </p>
                </div>
              </div>
            </DialogContent>
          </Dialog>

          <a
            href="https://github.com/ronggur/solar-system"
            target="_blank"
            rel="noopener noreferrer"
            className="p-2 rounded-lg bg-white/5 border border-white/10 hover:bg-white/10 hover:border-white/30 transition-all text-white/70 hover:text-white"
          >
            <Github className="w-5 h-5" />
          </a>
        </div>
      </div>
    </header>
  );
}
