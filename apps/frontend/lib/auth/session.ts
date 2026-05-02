'use client';

let accessToken: string | null = null;

export const session = {
  get: () => accessToken,
  set: (t: string | null) => {
    accessToken = t;
  },
};
