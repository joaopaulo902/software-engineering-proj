// Ponto de partida do Cliente Web.

import React from 'react';
import ReactDOM from 'react-dom/client';
import { Aplicacao } from './Aplicacao';
import './estilos/estilo.css';
import './estilos/projetos.css';

ReactDOM.createRoot(document.getElementById('app')).render(
  <React.StrictMode>
    <Aplicacao />
  </React.StrictMode>
);
