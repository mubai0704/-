export type Gender = 'male' | 'female' | 'unknown';

export interface Member {
  id: string;
  name: string;
  gender: Gender;
  x: number;
  y: number;
  isIndex?: boolean;
  isDeceased?: boolean;
  hasDisability?: boolean;
  hasChronicDisease?: boolean;
  note?: string;
  age?: string;
}

export type UnionType = 'marriage' | 'cohabitation' | 'separation' | 'divorce';

export interface Union {
  id: string;
  partnerAId: string;
  partnerBId: string;
  type: UnionType;
}

export interface Child {
  id: string;
  unionId: string;
  memberId: string;
  multipleBirthId?: string;
}

export interface GenogramData {
  members: Member[];
  unions: Union[];
  children: Child[];
}
