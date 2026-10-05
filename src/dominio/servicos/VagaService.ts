import { NaoEncontrado } from '../erros';
import { Vaga } from '../entidades/Vaga';
import { IVagaRepository, VagaComProjeto } from '../../persistencia/interfaces/IVagaRepository';

/**
 * C01 - Consultar e Filtrar Vagas de Extensao.
 *
 * Implementado parcialmente nesta etapa: busca textual e filtro por area sobre
 * as vagas abertas. Serve de apoio ao C04, porque e dela que o estudante parte
 * para escolher a vaga.
 */
export class VagaService {
  constructor(private readonly vagas: IVagaRepository) {}

  async listarAbertas(termo?: string, area?: string): Promise<VagaComProjeto[]> {
    const abertas = await this.vagas.listarAbertas();

    const termoNormalizado = normalizar(termo);
    const areaNormalizada = normalizar(area);

    return abertas.filter((item) => {
      const combinaArea = !areaNormalizada || normalizar(item.projetoArea) === areaNormalizada;

      const combinaTermo =
        !termoNormalizado ||
        normalizar(item.vaga.titulo).includes(termoNormalizado) ||
        normalizar(item.vaga.requisitos).includes(termoNormalizado) ||
        normalizar(item.projetoNome).includes(termoNormalizado);

      return combinaArea && combinaTermo;
    });
  }

  async buscarPorId(id: number): Promise<Vaga> {
    const vaga = await this.vagas.buscarPorId(id);
    if (!vaga) {
      throw new NaoEncontrado('Vaga não encontrada.');
    }
    return vaga;
  }
}

/** Minusculas e sem acento, para a busca achar "extensao" quando o titulo tem "extensão". */
function normalizar(texto?: string | null): string {
  if (!texto) return '';
  return texto
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .trim();
}
