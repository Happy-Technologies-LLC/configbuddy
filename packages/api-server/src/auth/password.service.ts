// Copyright 2026 Happy Technologies LLC
// SPDX-License-Identifier: Apache-2.0

/**
 * Password Service
 * Handles password hashing and verification using bcrypt
 */

import * as bcrypt from 'bcrypt';
import type { ConfigSchema } from '@cmdb/common';

export class PasswordService {
  private rounds: number;

  constructor(config: ConfigSchema['auth']['bcrypt']) {
    this.rounds = config.rounds;
  }

  /**
   * Hash a password
   */
  async hash(password: string): Promise<string> {
    return bcrypt.hash(password, this.rounds);
  }

  /**
   * Verify a password against a hash
   */
  async verify(password: string, hash: string): Promise<boolean> {
    return bcrypt.compare(password, hash);
  }

  /**
   * Check if a hash needs to be rehashed (rounds changed)
   */
  needsRehash(hash: string): boolean {
    const currentRounds = bcrypt.getRounds(hash);
    return currentRounds !== this.rounds;
  }
}
