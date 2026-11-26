"use client";

import { useToast } from "@/components/ui/useToast";
import { useEffect, useMemo, useRef, useState, useTransition } from "react";
import { API_BASE_URL, apiClient, getClientToken } from "@/lib/axios";

import { replyToTicketAction } from "@/app/actions";
import { Button } from "@/components/ui/Button";
import { Panel } from "@/components/ui/PageLayout";
import { StatusChip } from "@/components/ui/StatusChip";
import { formatTimeWit } from "@/lib/format";
import { TICKET_STAGE, ticketStageOf } from "@/lib/labels";
import { useDebounce } from "@/lib/useDebounce";
import type { SupportTicketView, TicketMessageView } from "@/lib/operations";

{
  /*
  Batas panjang balasan. Nilainya harus sama dengan MAKS_PANJANG_PESAN
  di backend; kalau berbeda, pengguna bisa lolos di kotak isian tetapi
  ditolak server, atau sebaliknya.
*/
}
const MAKS_PANJANG_PESAN = 500;

const TICKET_STATUS_MAP: Record<string, string> = {
  OPEN: "baru",
  IN_PROGRESS: "ditangani",
  WAITING_CUSTOMER: "menunggu_pelanggan",
  RESOLVED: "selesai",
  CLOSED: "selesai",
};

const SSE_BACKOFF_MS = [2_000, 4_000, 10_000, 30_000];

type TicketDetailClientResult = {
  success: boolean;
  messages: TicketMessageView[];
  handledBy?: string;
  assignedAdminId?: string | null;
  assignedAdminName?: string | null;
  isMine?: boolean;
  status?: string;
  rawStatus?: string;
  message?: string;
};

async function fetchTicketDetailClient(
  ticketId: string,
  signal?: AbortSignal,
): Promise<TicketDetailClientResult> {
  if (!ticketId) {
    return { success: false, messages: [], message: "Tiket tidak valid." };
  }

  try {
    const res = await apiClient.get(`/admin/tickets/${encodeURIComponent(ticketId)}`, {
      signal,
    });
    const data = res.data?.data as {
      customer?: { fullName?: string } | null;
      handledBy?: string;
      assignedAdmin?: { id: string; fullName: string } | null;
      isMine?: boolean;
      status?: string;
      messages?: Array<{
        id: string;
        body: string;
        isCustomer: boolean;
        isAi?: boolean;
        sentAt: string;
        sender?: { fullName: string } | null;
      }>;
    } | null;

    if (!data) {
      return { success: false, messages: [], message: "Percakapan tiket gagal dimuat." };
    }

    const customerName = data.customer?.fullName ?? "Pelanggan";
    const messages: TicketMessageView[] = (data.messages ?? []).map((m) => ({
      id: m.id,
      from: m.isCustomer ? "pelanggan" : "tim",
      text: m.body,
      sentAt: m.sentAt,
      senderName: m.isCustomer
        ? (m.sender?.fullName ?? customerName)
        : m.isAi
          ? "Bot AI"
          : (m.sender?.fullName ?? "Admin"),
    }));

    return {
      success: true,
      messages,
      handledBy: data.handledBy,
      assignedAdminId: data.assignedAdmin?.id ?? null,
      assignedAdminName: data.assignedAdmin?.fullName ?? null,
      isMine: Boolean(data.isMine),
      status: data.status ? (TICKET_STATUS_MAP[data.status] ?? "baru") : undefined,
      rawStatus: data.status,
    };
  } catch (err: unknown) {
    const message =
      (err as { response?: { data?: { error?: { message?: string } } } })?.response?.data?.error
        ?.message || "Percakapan tiket gagal dimuat.";
    return { success: false, messages: [], message };
  }
}

type Props = {
  initialTickets: SupportTicketView[];
  initialMessages: TicketMessageView[];
};

function initialOf(label: string): string {
  return label.trim().charAt(0).toUpperCase() || "?";
}

function TicketHandlerBadge({ ticket }: { ticket: SupportTicketView }) {
  if (ticket.assignedAdminId) {
    if (ticket.isMine) {
      return (
        <span className="rounded-xs border border-teal bg-teal/10 px-1.5 py-0.5 text-micro font-semibold text-teal">
          Anda pegang
        </span>
      );
    }

    return (
      <span className="rounded-xs border border-navy bg-navy/10 px-1.5 py-0.5 text-micro font-semibold text-navy">
        Dipegang oleh {ticket.assignedAdminName ?? "Admin lain"}
      </span>
    );
  }

  if (ticket.status !== "selesai" && ticket.handledBy !== "HUMAN") {
    return (
      <span className="inline-flex items-center gap-1 rounded-xs border border-rule-strong bg-canvas px-1.5 py-0.5 text-micro font-semibold text-ink-soft">
        <span aria-hidden="true" className="h-1.5 w-1.5 rounded-full bg-teal" />
        Bot AI
      </span>
    );
  }

  return null;
}

export function TicketWorkspace({ initialTickets, initialMessages }: Props) {
  const [tickets, setTickets] = useState<SupportTicketView[]>(initialTickets);
  const firstTicketId = initialTickets[0]?.id ?? "";
  const [query, setQuery] = useState("");
  const debouncedQuery = useDebounce(query, 300);
  const [activeId, setActiveId] = useState(firstTicketId);
  const activeIdRef = useRef(firstTicketId);
  const [messages, setMessages] = useState<TicketMessageView[]>(initialMessages);
  const [draft, setDraft] = useState("");
  const [draftError, setDraftError] = useState<string | null>(null);
  const { show, node } = useToast();
  const [isSending, startTransition] = useTransition();
  const [isLoadingMessages, startLoadMessages] = useTransition();

  useEffect(() => {
    if (!activeId) return;

    const controller = new AbortController();
    const ticketId = activeId;
    let attempt = 0;
    let reconnectTimer: number | undefined;
    let waitingForVisibility = false;

    function clearReconnectTimer() {
      if (reconnectTimer !== undefined) {
        window.clearTimeout(reconnectTimer);
        reconnectTimer = undefined;
      }
    }

    function scheduleReconnect() {
      if (controller.signal.aborted) return;
      clearReconnectTimer();

      if (document.visibilityState === "hidden") {
        waitingForVisibility = true;
        return;
      }

      const delay = SSE_BACKOFF_MS[Math.min(attempt, SSE_BACKOFF_MS.length - 1)];
      attempt += 1;
      reconnectTimer = window.setTimeout(() => {
        if (!controller.signal.aborted) {
          void connectSse();
        }
      }, delay);
    }

    function onVisibilityChange() {
      if (
        document.visibilityState === "visible" &&
        waitingForVisibility &&
        !controller.signal.aborted
      ) {
        waitingForVisibility = false;
        attempt = 0;
        void connectSse();
      }
    }

    document.addEventListener("visibilitychange", onVisibilityChange);

    async function connectSse() {
      if (controller.signal.aborted) return;
      if (document.visibilityState === "hidden") {
        waitingForVisibility = true;
        return;
      }

      const token = getClientToken();
      let shouldStop = false;

      try {
        const res = await fetch(
          `${API_BASE_URL}/admin/tickets/${encodeURIComponent(ticketId)}/events`,
          {
            method: "GET",
            headers: {
              Accept: "text/event-stream",
              ...(token ? { Authorization: `Bearer ${token}` } : {}),
            },
            signal: controller.signal,
          },
        );

        if (res.status === 401 || res.status === 403 || res.status === 404) {
          shouldStop = true;
          return;
        }

        if (!res.ok || !res.body) return;

        attempt = 0;
        const reader = res.body.getReader();
        const decoder = new TextDecoder("utf-8");
        let buffer = "";

        while (!controller.signal.aborted) {
          const { done, value } = await reader.read();
          if (done) break;

          buffer += decoder.decode(value, { stream: true });
          const blocks = buffer.split("\n\n");
          buffer = blocks.pop() ?? "";

          for (const block of blocks) {
            const lines = block.split("\n");
            let eventType = "";
            const dataLines: string[] = [];

            for (const line of lines) {
              if (line.startsWith(":")) continue;
              if (line.startsWith("event:")) {
                eventType = line.slice(6).trim();
              } else if (line.startsWith("data:")) {
                dataLines.push(line.slice(5).trim());
              }
            }

            if (dataLines.length === 0) continue;
            let payload: Record<string, unknown> = {};
            try {
              payload = JSON.parse(dataLines.join("\n")) as Record<string, unknown>;
            } catch {
              continue;
            }

            const jenis = (payload.jenis as string) || eventType;
            if (jenis === "pesan" || jenis === "handover" || jenis === "status") {
              const hasil = await fetchTicketDetailClient(ticketId, controller.signal);
              if (!controller.signal.aborted && activeIdRef.current === ticketId && hasil.success) {
                setMessages(hasil.messages);
                setTickets((current) =>
                  current.map((t) =>
                    t.id === ticketId
                      ? {
                          ...t,
                          ...(hasil.handledBy ? { handledBy: hasil.handledBy } : {}),
                          ...(hasil.assignedAdminId !== undefined
                            ? { assignedAdminId: hasil.assignedAdminId }
                            : {}),
                          ...(hasil.assignedAdminName !== undefined
                            ? { assignedAdminName: hasil.assignedAdminName }
                            : {}),
                          ...(hasil.isMine !== undefined ? { isMine: hasil.isMine } : {}),
                          ...(hasil.status ? { status: hasil.status } : {}),
                          ...(hasil.rawStatus ? { rawStatus: hasil.rawStatus } : {}),
                          ...(jenis === "status" &&
                          (payload.status === "CLOSED" || payload.status === "RESOLVED")
                            ? {
                                status: "selesai",
                                rawStatus: payload.status as "CLOSED" | "RESOLVED",
                              }
                            : {}),
                        }
                      : t,
                  ),
                );
              }
            }
          }
        }
      } catch {
        // Koneksi terputus atau ditutup saat berpindah tiket/unmount; sambung ulang bila masih aktif.
      } finally {
        if (!shouldStop && !controller.signal.aborted) {
          scheduleReconnect();
        }
      }
    }

    void connectSse();

    return () => {
      controller.abort();
      clearReconnectTimer();
      document.removeEventListener("visibilitychange", onVisibilityChange);
    };
  }, [activeId]);

  {
    /*
    Berpindah tiket harus memuat percakapan tiket itu, bukan mempertahankan
    percakapan tiket sebelumnya. Tanpa ini, pesan pelanggan tertukar antar tiket
    dan balasan bisa terkirim ke tiket yang salah.
  */
  }
  function pilihTiket(ticketId: string) {
    if (ticketId === activeId) return;

    setActiveId(ticketId);
    activeIdRef.current = ticketId;
    setMessages([]);
    setDraftError(null);

    startLoadMessages(async () => {
      const hasil = await fetchTicketDetailClient(ticketId);

      // Tiket bisa berpindah lagi selagi permintaan berjalan; hasil yang datang
      // terlambat untuk tiket lama tidak boleh menimpa percakapan tiket aktif.
      if (activeIdRef.current === ticketId) {
        setMessages(hasil.messages);
        if (hasil.success) {
          setTickets((current) =>
            current.map((t) =>
              t.id === ticketId
                ? {
                    ...t,
                    ...(hasil.handledBy ? { handledBy: hasil.handledBy } : {}),
                    ...(hasil.assignedAdminId !== undefined
                      ? { assignedAdminId: hasil.assignedAdminId }
                      : {}),
                    ...(hasil.assignedAdminName !== undefined
                      ? { assignedAdminName: hasil.assignedAdminName }
                      : {}),
                    ...(hasil.isMine !== undefined ? { isMine: hasil.isMine } : {}),
                    ...(hasil.status ? { status: hasil.status } : {}),
                    ...(hasil.rawStatus ? { rawStatus: hasil.rawStatus } : {}),
                  }
                : t,
            ),
          );
        } else {
          show(hasil.message ?? "Percakapan gagal dimuat.", "error");
        }
      }
    });
  }

  {
    /*
    Tiket selesai dipindahkan ke tab Arsip supaya daftar utama hanya berisi
    pekerjaan yang masih perlu ditangani. Sebelumnya tiket selesai menumpuk di
    daftar yang sama dan mendorong tiket baru ke bawah.
  */
  }
  const [tabDaftar, setTabDaftar] = useState<"aktif" | "arsip">("aktif");

  /* Tab Arsip memuat dua hal yang berbeda umurnya: tiket yang sudah dijawab dan
     menunggu konfirmasi pelanggan, serta tiket yang benar-benar ditutup. Tanpa
     saringan, keduanya tercampur dan tiket yang baru ditutup sistem tidak bisa
     dibedakan dari yang masih mungkin dibalas pelanggan. */
  const [saringArsip, setSaringArsip] = useState<"semua" | "RESOLVED" | "CLOSED">("semua");

  /* Tiket yang lahir dari tombol "Chat dengan CS" di aplikasi membawa kode
     pesanan. Staf yang sedang mengurus serah terima ingin melihat hanya
     percakapan pesanan, tanpa tercampur tiket umum dari pusat bantuan. */
  const [saringSumber, setSaringSumber] = useState<"semua" | "pesanan">("semua");

  const tiketAktif = useMemo(() => tickets.filter((t) => t.status !== "selesai"), [tickets]);
  const tiketArsip = useMemo(
    () =>
      tickets
        .filter((t) => t.status === "selesai")
        /* Yang paling baru dikerjakan muncul lebih dulu: arsip dibaca untuk
           mencari tiket yang baru saja ditutup, bukan yang paling tua. */
        .sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()),
    [tickets],
  );
  const tiketArsipTersaring = useMemo(
    () =>
      saringArsip === "semua"
        ? tiketArsip
        : tiketArsip.filter((t) => t.rawStatus === saringArsip),
    [saringArsip, tiketArsip],
  );

  const filteredTickets = useMemo(() => {
    const sumberAwal = tabDaftar === "aktif" ? tiketAktif : tiketArsipTersaring;
    const sumber =
      saringSumber === "pesanan"
        ? sumberAwal.filter((ticket) => ticket.bookingCode !== null)
        : sumberAwal;
    const keyword = debouncedQuery.trim().toLowerCase();
    if (keyword.length === 0) return sumber;
    return sumber.filter((ticket) =>
      [
        ticket.customerLabel,
        ticket.title,
        ticket.bookingCode ?? "",
      ].some((field) => field.toLowerCase().includes(keyword)),
    );
  }, [debouncedQuery, saringSumber, tabDaftar, tiketAktif, tiketArsipTersaring]);

  const activeTicket = tickets.find((ticket) => ticket.id === activeId) ?? null;
  const isResolvedOrClosed = activeTicket?.status === "selesai";

  /* Kepemilikan tiket: isMine dihitung server, dan Super Admin dapat melihat
     tiket yang sedang dipegang admin lain dengan kotak ketik dinonaktifkan. */
  const dipegangOrangLain = Boolean(activeTicket?.assignedAdminId) && !activeTicket?.isMine;

  function sendReply() {
    if (!activeTicket || isResolvedOrClosed || dipegangOrangLain) return;
    const targetTicketId = activeTicket.id;
    const text = draft.trim();
    if (text.length === 0) {
      setDraftError("Balasan tidak boleh kosong.");
      return;
    }

    setDraftError(null);
    setDraft("");

    startTransition(async () => {
      // Balasan tampil lebih dulu, lalu dikirim ke Express lewat Server Action.
      // Jika belum ada pemilik, backend otomatis mengunci tiket ke admin pengirim.
      const optimisticMessage: TicketMessageView = {
        id: `optimistic-${Date.now()}`,
        from: "tim",
        text,
        sentAt: new Date().toISOString(),
        senderName: "Anda",
      };
      setMessages((current) => [...current, optimisticMessage]);

      const result = await replyToTicketAction(targetTicketId, text);
      if (result.success) {
        show(result.message ?? "Balasan terkirim.");
        const segar = await fetchTicketDetailClient(targetTicketId);
        if (segar.success && activeIdRef.current === targetTicketId) {
          setMessages(segar.messages);
        }
        setTickets((current) =>
          current.map((t) =>
            t.id === targetTicketId
              ? {
                  ...t,
                  assignedAdminId: segar.assignedAdminId ?? t.assignedAdminId ?? "saya",
                  assignedAdminName: segar.assignedAdminName ?? t.assignedAdminName ?? "Anda",
                  isMine: segar.isMine ?? true,
                  handledBy: "HUMAN",
                  status: "menunggu_pelanggan",
                  messageCount: t.messageCount + 1,
                }
              : t,
          ),
        );
      } else {
        // Gagal kirim: tarik kembali pesan optimistis supaya tidak menyesatkan.
        setMessages((current) => current.filter((message) => message.id !== optimisticMessage.id));
        setDraft(text);
        setDraftError(result.message ?? "Balasan gagal dikirim.");
        show(result.message ?? "Gagal mengirim balasan.", "error");
      }
    });
  }

  return (
    <>
      {node}

      <div className="mt-3 grid gap-3 lg:h-[calc(100vh-13rem)] lg:grid-cols-[300px_minmax(0,1fr)]">
        <div className="flex min-h-0 min-w-0 flex-col">
          {/* isiTinggi: daftar tiket menggulir sendiri di dalam panel, bukan
              memanjangkan halaman. */}
          <Panel title="Tiket masuk" isiTinggi>
            <div
              role="tablist"
              aria-label="Kelompok tiket"
              className="mb-2 flex gap-1 border-b border-rule pb-2"
            >
              {[
                { id: "aktif" as const, label: "Aktif", jumlah: tiketAktif.length },
                { id: "arsip" as const, label: "Arsip", jumlah: tiketArsip.length },
              ].map((tab) => (
                <button
                  key={tab.id}
                  type="button"
                  role="tab"
                  aria-selected={tabDaftar === tab.id}
                  onClick={() => setTabDaftar(tab.id)}
                  className={`rounded-sm px-2.5 py-1 text-meta font-semibold focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-navy ${
                    tabDaftar === tab.id
                      ? "bg-navy text-white"
                      : "border border-rule bg-surface text-ink hover:bg-canvas"
                  }`}
                >
                  {tab.label} ({tab.jumlah})
                </button>
              ))}
            </div>

            {/* Saringan arsip: memisahkan tiket yang menunggu konfirmasi pelanggan
                dari tiket yang sudah ditutup sistem. */}
            {tabDaftar === "arsip" ? (
              <div className="mb-2 flex flex-wrap gap-1.5" role="group" aria-label="Saring arsip">
                {[
                  { id: "semua" as const, label: "Semua" },
                  { id: "RESOLVED" as const, label: "Teratasi" },
                  { id: "CLOSED" as const, label: "Ditutup" },
                ].map((saring) => (
                  <button
                    key={saring.id}
                    type="button"
                    aria-pressed={saringArsip === saring.id}
                    onClick={() => setSaringArsip(saring.id)}
                    className={`rounded-full px-2.5 py-1 text-micro font-semibold focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-navy ${
                      saringArsip === saring.id
                        ? "bg-teal text-white"
                        : "border border-rule bg-surface text-ink-soft hover:bg-canvas"
                    }`}
                  >
                    {saring.label}
                  </button>
                ))}
              </div>
            ) : null}

            {/* Saringan sumber: tiket pesanan datang dari tombol "Chat dengan CS"
                di aplikasi, tiket umum dari formulir pusat bantuan. */}
            <div className="mb-2 flex flex-wrap gap-1.5" role="group" aria-label="Saring sumber tiket">
              {[
                { id: "semua" as const, label: "Semua sumber" },
                { id: "pesanan" as const, label: "Dari pesanan" },
              ].map((saring) => (
                <button
                  key={saring.id}
                  type="button"
                  aria-pressed={saringSumber === saring.id}
                  onClick={() => setSaringSumber(saring.id)}
                  className={`rounded-full px-2.5 py-1 text-micro font-semibold focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-navy ${
                    saringSumber === saring.id
                      ? "bg-navy text-white"
                      : "border border-rule bg-surface text-ink-soft hover:bg-canvas"
                  }`}
                >
                  {saring.label}
                </button>
              ))}
            </div>

            <label htmlFor="ticket-search" className="sr-only">
              Cari tiket
            </label>
            <input
              id="ticket-search"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Cari tiket"
              className="h-11 w-full rounded-sm border border-rule-strong bg-canvas px-3 text-body text-ink focus:border-navy focus:outline-none focus:ring-2 focus:ring-navy"
            maxLength={50}
              />

            <ul className="mt-3 min-h-0 flex-1 space-y-1.5 overflow-y-auto pr-1">
              {filteredTickets.map((ticket) => {
                const active = ticket.id === activeId;
                const belumDibalas = ticketStageOf(ticket.status) === "baru";
                return (
                  <li key={ticket.id}>
                    <button
                      type="button"
                      onClick={() => {
                        pilihTiket(ticket.id);
                      }}
                      aria-current={active ? "true" : undefined}
                      className={`flex w-full items-start gap-2.5 rounded-sm border px-2.5 py-2.5 text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-navy ${
                        active ? "border-teal bg-canvas" : "border-rule hover:bg-canvas"
                      }`}
                    >
                      <span
                        aria-hidden="true"
                        className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-navy text-body font-semibold text-white"
                      >
                        {initialOf(ticket.customerLabel)}
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="flex flex-wrap items-center gap-1.5">
                          <span className="text-body font-semibold text-ink">
                            {ticket.customerLabel}
                          </span>
                          {belumDibalas ? (
                            <StatusChip tone={TICKET_STAGE.baru.tone}>
                              {TICKET_STAGE.baru.label}
                            </StatusChip>
                          ) : null}
                          <TicketHandlerBadge ticket={ticket} />
                        </span>
                        {ticket.bookingCode ? (
                          <span className="mt-1 inline-flex items-center rounded-xs border border-rule-strong bg-canvas px-1.5 py-0.5 text-micro font-semibold tabular-nums text-ink">
                            Pesanan {ticket.bookingCode}
                          </span>
                        ) : null}
                        <span className="mt-1 block truncate text-meta text-ink-soft">
                          {ticket.title}
                        </span>
                      </span>
                    </button>
                  </li>
                );
              })}
            </ul>

            {filteredTickets.length === 0 ? (
              <p className="mt-3 text-meta text-ink-soft">
                {tickets.length === 0
                  ? "Belum ada tiket yang masuk dari pelanggan."
                  : saringSumber === "pesanan"
                    ? "Belum ada tiket yang dibuka dari pesanan."
                    : tabDaftar === "arsip"
                    ? saringArsip === "RESOLVED"
                      ? "Tidak ada tiket yang sedang menunggu jawaban pelanggan."
                      : saringArsip === "CLOSED"
                        ? "Belum ada tiket yang ditutup."
                        : "Belum ada tiket di arsip."
                    : "Tidak ada tiket aktif yang cocok dengan kata kunci itu."}
              </p>
            ) : null}
          </Panel>
        </div>

        <div className="flex min-h-0 min-w-0 flex-col">
          <section className="flex min-h-0 flex-col overflow-hidden rounded-md border border-rule bg-surface lg:h-full">
            {activeTicket ? (
              <>
                <div className="border-b border-rule px-4 py-3">
                  {/* Judul dan tombol berbagi satu baris: judul di kiri, aksi di
                      kanan. Sebelumnya tombol diletakkan di baris sendiri sehingga
                      menggantung di kiri dan menyisakan ruang kosong lebar. */}
                  <div className="flex flex-wrap items-start justify-between gap-x-4 gap-y-2">
                    <div className="min-w-0 flex-1">
                      <h3 className="text-subtitle font-semibold leading-snug text-ink">
                        {activeTicket.title}
                      </h3>

                      <div className="mt-2 flex flex-wrap items-center gap-x-2.5 gap-y-1.5">
                        <span
                          aria-hidden="true"
                          className="flex h-7 w-7 items-center justify-center rounded-full bg-navy text-meta font-semibold text-white"
                        >
                          {initialOf(activeTicket.customerLabel)}
                        </span>
                        <span className="text-meta font-medium text-ink">
                          {activeTicket.customerLabel}
                        </span>
                        <TicketHandlerBadge ticket={activeTicket} />
                        {activeTicket.bookingCode ? (
                          <span className="rounded-xs border border-rule-strong bg-canvas px-1.5 py-0.5 text-micro font-semibold tabular-nums text-ink">
                            Pesanan {activeTicket.bookingCode}
                          </span>
                        ) : null}
                      </div>
                    </div>

                    <div className="flex shrink-0 items-center gap-2">
                      {isResolvedOrClosed ? (
                        <span className="text-micro text-ink-soft">Tiket sudah ditutup</span>
                      ) : null}
                    </div>
                  </div>
                </div>

                <div className="min-h-0 flex-1 overflow-y-auto px-4 py-3">
                  {isLoadingMessages ? (
                    <div className="rounded-sm border border-rule bg-canvas px-4 py-6 text-center">
                      <p className="text-body text-ink-soft">Memuat percakapan tiket...</p>
                    </div>
                  ) : messages.length === 0 ? (
                    <div className="rounded-sm border border-rule bg-canvas px-4 py-6 text-center">
                      <p className="text-body font-semibold text-ink">Belum ada pesan</p>
                      <p className="mt-2 text-body text-ink-soft">
                        Pesan pelanggan dan balasan tim akan muncul di sini.
                      </p>
                    </div>
                  ) : (
                    <ul className="space-y-3">
                      {messages.map((message) => {
                        const waktuPesan = formatTimeWit(message.sentAt);
                        return (
                          <li
                            key={message.id}
                            className={`w-fit max-w-[80%] rounded-md border px-4 py-3 text-body ${
                              message.from === "tim"
                                ? "ml-auto border-teal/40 bg-canvas text-ink"
                                : "border-rule bg-surface text-ink"
                            }`}
                          >
                            <span className="flex items-center justify-between gap-3 text-micro font-semibold text-ink-soft">
                              <span className="uppercase">
                                {message.from === "tim"
                                  ? `oleh ${message.senderName || "Admin"}`
                                  : message.senderName || activeTicket.customerLabel}
                              </span>
                              {waktuPesan ? (
                                <span className="font-normal tabular-nums text-ink-soft">
                                  {waktuPesan}
                                </span>
                              ) : null}
                            </span>
                            <span className="mt-1 block whitespace-pre-wrap">{message.text}</span>
                          </li>
                        );
                      })}
                    </ul>
                  )}
                </div>

                <div className="border-t border-rule px-4 py-3">
                  {isResolvedOrClosed ? (
                    <div className="rounded-sm border border-rule bg-canvas p-2.5 text-center text-meta text-ink-soft">
                      Tiket ini sudah ditutup dan tidak menerima pesan baru. Kalau pelanggan masih
                      perlu dibantu, minta mereka membuat tiket baru.
                    </div>
                  ) : (
                    <>
                      {/* Template Balasan Cepat (Canned Responses) */}
                      <div className="mb-2.5 flex flex-wrap items-center gap-1.5">
                        <span className="text-micro font-semibold uppercase text-ink-soft mr-1">
                          Balasan Cepat:
                        </span>
                        <button
                          type="button"
                          disabled={dipegangOrangLain}
                          onClick={() =>
                            setDraft(
                              "Halo, armada yang Anda tanyakan tersedia dan siap digunakan sesuai jadwal.",
                            )
                          }
                          className="rounded-xs border border-rule bg-canvas px-2 py-0.5 text-micro font-medium text-ink hover:border-navy hover:text-navy disabled:cursor-not-allowed disabled:opacity-40"
                        >
                          + Unit Tersedia
                        </button>
                        <button
                          type="button"
                          disabled={dipegangOrangLain}
                          onClick={() =>
                            setDraft(
                              "Silakan lakukan transfer pelunasan ke rekening resmi perusahaan. Nomor rekening yang benar kami kirimkan melalui kanal resmi agar tidak tertukar dengan rekening lain.",
                            )
                          }
                          className="rounded-xs border border-rule bg-canvas px-2 py-0.5 text-micro font-medium text-ink hover:border-navy hover:text-navy disabled:cursor-not-allowed disabled:opacity-40"
                        >
                          + Rekening Resmi
                        </button>
                        <button
                          type="button"
                          disabled={dipegangOrangLain}
                          onClick={() =>
                            setDraft(
                              "Supir resmi kami telah ditugaskan dan akan segera menghubungi nomor Anda sebelum jadwal penjemputan.",
                            )
                          }
                          className="rounded-xs border border-rule bg-canvas px-2 py-0.5 text-micro font-medium text-ink hover:border-navy hover:text-navy disabled:cursor-not-allowed disabled:opacity-40"
                        >
                          + Konfirmasi Supir
                        </button>
                      </div>

                      {dipegangOrangLain ? (
                        <p className="mb-2 text-meta font-medium text-navy">
                          Dipegang oleh {activeTicket.assignedAdminName ?? "admin lain"}. Hanya
                          pemegang tiket ini yang dapat membalas.
                        </p>
                      ) : null}

                      <label htmlFor="ticket-reply" className="sr-only">
                        Tulis balasan
                      </label>
                      <div className="flex flex-col gap-2.5 sm:flex-row">
                        <input
                          id="ticket-reply"
                          value={draft}
                          onChange={(event) => setDraft(event.target.value)}
                          maxLength={MAKS_PANJANG_PESAN}
                          disabled={dipegangOrangLain}
                          placeholder={
                            dipegangOrangLain
                              ? `Tiket ini sedang dipegang oleh ${activeTicket.assignedAdminName ?? "admin lain"}.`
                              : "Tulis balasan solusi resmi ke pelanggan..."
                          }
                          aria-invalid={Boolean(draftError)}
                          aria-describedby={draftError ? "ticket-reply-error" : undefined}
                          className="h-10 min-w-0 flex-1 rounded-sm border border-rule bg-canvas px-3 text-meta text-ink focus:border-navy focus:outline-none focus:ring-1 focus:ring-navy disabled:cursor-not-allowed disabled:bg-gray-100 disabled:text-ink-soft"
                        />
                        <Button
                          variant="confirm"
                          size="md"
                          onClick={sendReply}
                          disabled={isSending || dipegangOrangLain}
                        >
                          {isSending ? "Mengirim..." : "Kirim Balasan"}
                        </Button>
                      </div>
                      {/* Penghitung memberi tahu sisa ruang sebelum batas
                          tercapai, supaya teks tidak terpotong tiba-tiba. */}
                      <p
                        className={`mt-1 text-right text-micro tabular-nums ${
                          draft.length > MAKS_PANJANG_PESAN * 0.9
                            ? "text-amber-600"
                            : "text-ink-soft"
                        }`}
                      >
                        {draft.length}/{MAKS_PANJANG_PESAN}
                      </p>
                      {draftError ? (
                        <p id="ticket-reply-error" className="mt-2 text-meta text-danger">
                          {draftError}
                        </p>
                      ) : null}
                    </>
                  )}
                </div>
              </>
            ) : (
              <div className="px-4 py-6">
                <p className="text-body font-semibold text-ink">Belum ada tiket dipilih</p>
                <p className="mt-2 text-body text-ink-soft">
                  Pilih tiket di daftar kiri untuk membaca percakapan dan membalas.
                </p>
              </div>
            )}
          </section>
        </div>
      </div>
    </>
  );
}
