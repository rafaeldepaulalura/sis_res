import { Socket } from 'node:net';

// Envia os bytes direto para a impressora térmica de rede (porta 9100, o
// padrão "RAW"/JetDirect). Sem programa intermediário no balcão: se a
// impressora está na rede e ligada, imprime.
export function sendToPrinter(
  host: string,
  port: number,
  data: Buffer,
  timeoutMs = 5000,
): Promise<void> {
  return new Promise((resolve, reject) => {
    const socket = new Socket();
    let done = false;

    const finish = (err?: Error) => {
      if (done) return;
      done = true;
      socket.destroy();
      if (err) reject(err);
      else resolve();
    };

    // Impressora desligada costuma não recusar nem responder: sem timeout a
    // fila ficaria travada esperando para sempre.
    socket.setTimeout(timeoutMs);
    socket.on('timeout', () =>
      finish(new Error(`Sem resposta de ${host}:${port} em ${timeoutMs}ms`)),
    );
    socket.on('error', (e) =>
      finish(
        new Error(
          `Não foi possível conectar em ${host}:${port} — ${e.message}`,
        ),
      ),
    );

    socket.connect(port, host, () => {
      socket.write(data, (e) => {
        if (e) return finish(e);
        // end() garante que os bytes saíram antes de fechar.
        socket.end(() => finish());
      });
    });
  });
}
