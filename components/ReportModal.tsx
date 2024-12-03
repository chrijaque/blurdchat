import { useState } from 'react';
import { DatabaseService } from '@/lib/db';

interface ReportModalProps {
  isOpen: boolean;
  onClose: () => void;
  reporterId: string;
  reportedId: string;
  sessionId: string;
}

const REPORT_REASONS = [
  'Upassende opførsel',
  'Chikane',
  'Upassende indhold',
  'Spam',
  'Mindreårig bruger',
  'Andet'
] as const;

type ReportReason = typeof REPORT_REASONS[number];

export default function ReportModal({
  isOpen,
  onClose,
  reporterId,
  reportedId,
  sessionId
}: ReportModalProps) {
  const [reason, setReason] = useState<ReportReason | ''>('');
  const [description, setDescription] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [submitted, setSubmitted] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!reason) {
      setError('Vælg venligst en grund til rapporten');
      return;
    }

    setIsSubmitting(true);
    setError(null);

    try {
      await DatabaseService.createReport({
        reporterId,
        reportedId,
        reason,
        description: description.trim(),
        sessionId
      });
      setSubmitted(true);
    } catch (error) {
      setError('Der opstod en fejl ved indsendelse af rapporten. Prøv igen senere.');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (submitted) {
    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
        <div className="bg-white rounded-lg p-6 max-w-md w-full">
          <h2 className="text-2xl font-bold mb-4">Tak for din rapport</h2>
          <p className="text-gray-600 mb-6">
            Vi har modtaget din rapport og vil gennemgå den hurtigst muligt.
          </p>
          <button
            onClick={onClose}
            className="w-full bg-blue-500 text-white py-2 px-4 rounded-lg hover:bg-blue-600"
          >
            Luk
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg p-6 max-w-md w-full">
        <h2 className="text-2xl font-bold mb-4">Rapporter bruger</h2>
        
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Grund til rapport *
            </label>
            <select
              value={reason}
              onChange={(e) => setReason(e.target.value as ReportReason)}
              className="w-full border rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
              required
            >
              <option value="">Vælg grund</option>
              {REPORT_REASONS.map((r) => (
                <option key={r} value={r}>
                  {r}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Beskrivelse (valgfri)
            </label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full border rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 min-h-[100px]"
              placeholder="Beskriv problemet mere detaljeret..."
            />
          </div>

          {error && (
            <p className="text-red-500 text-sm">{error}</p>
          )}

          <div className="flex justify-end space-x-4">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-gray-600 hover:text-gray-800"
              disabled={isSubmitting}
            >
              Annuller
            </button>
            <button
              type="submit"
              className="bg-red-500 text-white px-4 py-2 rounded-lg hover:bg-red-600 disabled:opacity-50"
              disabled={isSubmitting}
            >
              {isSubmitting ? 'Sender...' : 'Send rapport'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
} 