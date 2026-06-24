import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import React from 'react';
import { LogbookView } from './LogbookView';
import { useSaveData } from '../hooks/useSaveData';
import { useQueryProgress } from '../hooks/useQueryProgress';
import { useI18n } from '../context/I18nContext';
import { useNotification } from '../context/NotificationContext';

vi.mock('../hooks/useSaveData');
vi.mock('../hooks/useQueryProgress');
vi.mock('../context/I18nContext');
vi.mock('../context/NotificationContext');

vi.mock('./DataTable', () => ({
  DataTable: () => React.createElement('div', { 'data-testid': 'data-table' }),
}));
vi.mock('./DataPagination', () => ({
  DataPagination: () => React.createElement('div', { 'data-testid': 'data-pagination' }),
}));

const mockQuery = vi.fn();
const mockShowNotification = vi.fn();

beforeEach(() => {
  vi.clearAllMocks();

  vi.mocked(useQueryProgress).mockReturnValue({
    inProgress: false,
    operation: null,
    message: null,
    startTime: null,
  });

  vi.mocked(useI18n).mockReturnValue({
    t: (key: string) => key,
    language: 'en',
    setLanguage: vi.fn(),
    availableLanguages: [],
  });

  vi.mocked(useNotification).mockReturnValue({
    notifications: [],
    showNotification: mockShowNotification,
    removeNotification: vi.fn(),
  });

  vi.mocked(useSaveData).mockReturnValue({
    query: mockQuery,
    queueExtraction: vi.fn(),
    getExtractionQueue: vi.fn(),
    isLoading: false,
    error: null,
  });

  // Default mock for log command (logbook entries fetch)
  mockQuery.mockImplementation((_save: string, command: string) => {
    if (command === 'log-metadata') {
      return Promise.resolve({ success: true, data: [] });
    }
    return Promise.resolve({
      success: true,
      data: [],
      pagination: { total: 0, limit: 20, offset: 0, hasMore: false },
    });
  });
});

describe('LogbookView', () => {
  it('renders category dropdown with dynamic metadata when log-metadata returns categories', async () => {
    const categoryMeta = [
      { id: 'combat', label: 'Combat', count: 45 },
      { id: 'trade', label: 'Trade', count: 12 },
    ];

    mockQuery.mockImplementation((_save: string, command: string) => {
      if (command === 'log-metadata') {
        return Promise.resolve({ success: true, data: categoryMeta });
      }
      return Promise.resolve({
        success: true,
        data: [],
        pagination: { total: 0, limit: 20, offset: 0, hasMore: false },
      });
    });

    render(<LogbookView saveId="save1" />);

    await waitFor(() => {
      expect(screen.getByRole('option', { name: /combat \(45\)/i })).toBeInTheDocument();
      expect(screen.getByRole('option', { name: /trade \(12\)/i })).toBeInTheDocument();
    });

    // Notification must NOT fire when categories are available
    expect(mockShowNotification).not.toHaveBeenCalled();
  });

  it('falls back to CATEGORY_ICONS list and shows notification when log-metadata returns empty array', async () => {
    mockQuery.mockImplementation((_save: string, command: string) => {
      if (command === 'log-metadata') {
        return Promise.resolve({ success: true, data: [] });
      }
      return Promise.resolve({
        success: true,
        data: [],
        pagination: { total: 0, limit: 20, offset: 0, hasMore: false },
      });
    });

    render(<LogbookView saveId="save1" />);

    // Fallback options come from CATEGORY_ICONS — t() mock returns the key as-is
    await waitFor(() => {
      expect(
        screen.getByRole('option', { name: 'logbook.categories.combat' })
      ).toBeInTheDocument();
      expect(
        screen.getByRole('option', { name: 'logbook.categories.misc' })
      ).toBeInTheDocument();
    });

    // Info notification should be shown when fallback is triggered and a save is loaded
    await waitFor(() => {
      expect(mockShowNotification).toHaveBeenCalledWith(
        'info',
        expect.any(String),
        expect.any(String)
      );
    });
  });
});
