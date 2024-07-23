import type { EmbeddingResponse } from "cross-llm";
import { _embed } from ".";
import type { Options, Params, Provider } from "./types";

export const embed = async (
  input: string | Array<string>,
  providerType: Provider,
  params: Params,
  options?: Options,
): Promise<EmbeddingResponse> =>
  _embed(undefined)(input, providerType, params, options);
