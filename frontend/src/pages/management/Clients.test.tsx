import { TextEncoder, TextDecoder } from 'util';
global.TextEncoder = TextEncoder;
global.TextDecoder = TextDecoder as any;

import React from "react";
import { render, screen, waitFor } from "@testing-library/react";
import "@testing-library/jest-dom";
import { MemoryRouter } from "react-router-dom";
import ClientsPage from "./Clients";

describe("ClientsPage", () => {
  beforeEach(() => {
    localStorage.clear();
    global.fetch = jest.fn().mockImplementation((url: string) => {
      if (url.includes("/api/clients/summary")) {
        return Promise.resolve({ ok: true, json: () => Promise.resolve({}) });
      }
      return Promise.resolve({ ok: true, json: () => Promise.resolve([]) });
    }) as jest.Mock;
  });

  it("renders the Clients heading and requests the client list", async () => {
    render(
      <MemoryRouter>
        <ClientsPage />
      </MemoryRouter>
    );

    expect(await screen.findByRole("heading", { name: "Clients" })).toBeInTheDocument();
    await waitFor(() => {
      const urls = (global.fetch as jest.Mock).mock.calls.map((c) => String(c[0]));
      expect(urls.some((u) => u.endsWith("/api/clients"))).toBe(true);
    });
  });
});
