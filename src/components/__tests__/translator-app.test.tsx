import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { TranslatorApp } from '@/components/translator-app';

describe('TranslatorApp', () => {
  beforeEach(() => {
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(
        JSON.stringify({
          providerStatus: {
            openai: true,
            gemini: false,
            local: true,
          },
          defaultModels: {
            openai: 'gpt-4.1-mini',
            gemini: 'gemini-2.0-flash',
            local: 'local-default',
          },
        }),
        {
          status: 200,
          headers: {
            'Content-Type': 'application/json',
          },
        },
      ),
    );

    vi.stubGlobal('fetch', fetchMock);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    window.location.hash = '';
  });

  it('renders saas dashboard shell with topbar and workspace sections', async () => {
    render(<TranslatorApp />);

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith('/api/translator-status');
    });

    expect(screen.getByText('Project Translate 翻譯管理台')).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: '專案文件翻譯控制台' })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: '翻譯工作區' })).toBeInTheDocument();
    const sidebarNavigation = screen.getByRole('navigation', { name: '控制台導覽' });

    expect(sidebarNavigation).toBeInTheDocument();
    expect(screen.getByRole('link', { name: '總覽儀表板' })).toHaveAttribute('aria-current', 'page');
    expect(screen.getByRole('link', { name: '建立翻譯任務' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: '任務狀態中心' })).toBeInTheDocument();
    expect(sidebarNavigation.querySelectorAll('.saas-nav-icon')).toHaveLength(3);
  });

  it('toggles sidebar drawer with menu button', async () => {
    render(<TranslatorApp />);

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith('/api/translator-status');
    });

    const toggleButton = screen.getByRole('button', { name: '切換導覽選單' });
    const sidebar = screen.getByLabelText('控制台側邊欄');

    expect(toggleButton).toHaveAttribute('aria-expanded', 'false');
    expect(sidebar).toHaveAttribute('data-sidebar-open', 'false');

    fireEvent.click(toggleButton);

    expect(toggleButton).toHaveAttribute('aria-expanded', 'true');
    expect(sidebar).toHaveAttribute('data-sidebar-open', 'true');
  });

  it('updates active nav item when hash changes', async () => {
    render(<TranslatorApp />);

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith('/api/translator-status');
    });

    const overviewLink = screen.getByRole('link', { name: '總覽儀表板' });
    const workspaceLink = screen.getByRole('link', { name: '建立翻譯任務' });

    expect(overviewLink).toHaveAttribute('aria-current', 'page');
    expect(workspaceLink).not.toHaveAttribute('aria-current');

    window.location.hash = '#workspace';
    fireEvent(window, new Event('hashchange'));

    await waitFor(() => {
      expect(workspaceLink).toHaveAttribute('aria-current', 'page');
    });

    expect(overviewLink).not.toHaveAttribute('aria-current');
  });
});
