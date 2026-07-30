// Bipe curto para pedido novo. Gerado no próprio navegador (Web Audio) —
// não depende de arquivo de áudio nem de rede.
let ctx: AudioContext | null = null;

export function playAlert() {
  try {
    ctx ??= new AudioContext();
    // Navegador bloqueia áudio antes de o usuário interagir com a página;
    // resume() cobre o caso de já ter havido um clique.
    if (ctx.state === 'suspended') void ctx.resume();

    // Duas notas curtas: chama atenção sem parecer alarme.
    [0, 0.18].forEach((offset, i) => {
      const osc = ctx!.createOscillator();
      const gain = ctx!.createGain();
      osc.type = 'sine';
      osc.frequency.value = i === 0 ? 880 : 1170;
      gain.gain.setValueAtTime(0.0001, ctx!.currentTime + offset);
      gain.gain.exponentialRampToValueAtTime(0.25, ctx!.currentTime + offset + 0.02);
      gain.gain.exponentialRampToValueAtTime(
        0.0001,
        ctx!.currentTime + offset + 0.15,
      );
      osc.connect(gain).connect(ctx!.destination);
      osc.start(ctx!.currentTime + offset);
      osc.stop(ctx!.currentTime + offset + 0.16);
    });
  } catch {
    // Sem áudio disponível: o aviso visual continua valendo.
  }
}
