import { useEffect, useRef } from 'react';

export function Modal({ titulo, aberto, aoFechar, children, rodape }) {
  const dialogRef = useRef(null);

  useEffect(() => {
    if (!aberto) return;
    dialogRef.current?.showModal();
  }, [aberto]);

  if (!aberto) return null;

  return (
    <dialog ref={dialogRef} className="popup" onCancel={aoFechar}>
      <div className="popup__caixa">
        <div className="popup__topo">
          <h2>{titulo}</h2>
          <button className="popup__fechar" type="button" onClick={aoFechar} aria-label="Fechar">×</button>
        </div>
        <div className="popup__corpo">{children}</div>
        {rodape && <div className="popup__acoes">{rodape}</div>}
      </div>
    </dialog>
  );
}
