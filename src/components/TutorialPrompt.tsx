import { Link } from '@tanstack/react-router';
import { X } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

import { useSessionStore } from '@/store/sessionStore';

export function TutorialPrompt() {
  const { tutorialSeen, markTutorialSeen } = useSessionStore();

  return (
    <AnimatePresence>
      {!tutorialSeen && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 20 }}
          className="mx-4 mb-2 card-surface p-3 flex items-start gap-2"
          style={{ borderColor: 'rgba(212, 175, 55, 0.3)' }}
        >
          <div className="flex-1">
            <p className="text-sm font-medium">Первый раз?</p>
            <Link to="/tutorial" className="text-xs text-[var(--app-link)]">
              Как играть за 30 секунд →
            </Link>
          </div>
          <button type="button" onClick={markTutorialSeen} aria-label="Закрыть">
            <X size={18} className="text-[var(--app-hint)]" />
          </button>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
