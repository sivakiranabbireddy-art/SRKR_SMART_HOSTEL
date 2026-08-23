const { generateInitialData } = require('./mockData');

class MemoryPrismaStore {
  constructor() {
    this.reset();
  }

  reset() {
    const data = generateInitialData();
    this.users = data.users;
    this.studentProfiles = data.studentProfiles;
    this.preferences = data.preferences;
    this.rooms = data.rooms;
    this.matchingRuns = data.matchingRuns;
    this.roomAllocations = data.roomAllocations;
    this.compatibilityScores = data.compatibilityScores;
    this.feedbacks = data.feedbacks;
    this.conflicts = data.conflicts;
    this.otpVerifications = [];
    this.systemSettingsRecord = {
      id: 'singleton',
      questionnaireDeadline: null,
      questionnaireOpen: true,
      updatedAt: new Date(),
    };
  }

  async $connect() {
    return true;
  }

  async $disconnect() {
    return true;
  }

  get user() {
    return {
      findUnique: async ({ where, include }) => {
        const u = this.users.find(x => (where.id && x.id === where.id) || (where.email && x.email.toLowerCase() === where.email.toLowerCase()));
        if (!u) return null;
        return this._populateUser(u, include);
      },
      findFirst: async ({ where, include }) => {
        const u = this.users.find(x => this._matchWhere(x, where));
        if (!u) return null;
        return this._populateUser(u, include);
      },
      findMany: async ({ where, include, skip = 0, take = 50, orderBy }) => {
        let list = this.users.filter(u => {
          if (where.role) {
            if (typeof where.role === 'object' && where.role.in) {
              if (!where.role.in.includes(u.role)) return false;
            } else if (u.role !== where.role) {
              return false;
            }
          }
          if (where.profile?.isNot && !this.studentProfiles.some(p => p.userId === u.id)) return false;
          const p = this.studentProfiles.find(p => p.userId === u.id);
          if (where.profile) {
            if (!p) return false;
            if (where.profile.department?.equals) {
              if (p.department.toLowerCase() !== where.profile.department.equals.toLowerCase()) return false;
            }
            if (where.profile.preference?.is?.isComplete !== undefined) {
              const pref = this.preferences.find(pr => pr.studentProfileId === p.id);
              if ((pref?.isComplete ?? false) !== where.profile.preference.is.isComplete) return false;
            }
            if (where.profile.OR) {
              const matchesOr = where.profile.OR.some(cond => {
                if (cond.firstName?.contains && p.firstName.toLowerCase().includes(cond.firstName.contains.toLowerCase())) return true;
                if (cond.lastName?.contains && p.lastName.toLowerCase().includes(cond.lastName.contains.toLowerCase())) return true;
                if (cond.studentId?.contains && p.studentId.toLowerCase().includes(cond.studentId.contains.toLowerCase())) return true;
                if (cond.department?.contains && p.department.toLowerCase().includes(cond.department.contains.toLowerCase())) return true;
                return false;
              });
              if (!matchesOr) return false;
            }
          }
          return true;
        });
        return list.slice(skip, skip + take).map(u => this._populateUser(u, include));
      },
      count: async ({ where } = {}) => {
        const list = await this.user.findMany({ where, skip: 0, take: 999999 });
        return list.length;
      },
      create: async ({ data, include }) => {
        const newUser = {
          id: `u-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
          email: data.email,
          passwordHash: data.passwordHash,
          role: data.role || 'STUDENT',
          isActive: data.isActive !== undefined ? data.isActive : true,
          createdAt: new Date(),
          updatedAt: new Date(),
        };
        this.users.push(newUser);

        if (data.profile?.create) {
          const p = data.profile.create;
          const newProfile = {
            id: `sp-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
            userId: newUser.id,
            firstName: p.firstName,
            lastName: p.lastName,
            studentId: p.studentId,
            department: p.department,
            year: p.year,
            phone: p.phone || null,
            gender: p.gender || 'MALE',
            profileComplete: false,
            createdAt: new Date(),
            updatedAt: new Date(),
          };
          this.studentProfiles.push(newProfile);
        }
        return this._populateUser(newUser, include);
      },
      update: async ({ where, data, include }) => {
        const idx = this.users.findIndex(x => (where.id && x.id === where.id) || (where.email && x.email === where.email));
        if (idx === -1) throw new Error('User not found');
        this.users[idx] = { ...this.users[idx], ...data, updatedAt: new Date() };
        return this._populateUser(this.users[idx], include);
      },
      delete: async ({ where }) => {
        this.users = this.users.filter(x => !(where.id && x.id === where.id) && !(where.email && x.email === where.email));
        return { success: true };
      },
      deleteMany: async ({ where } = {}) => {
        const count = this.users.length;
        if (where?.email) {
          this.users = this.users.filter(x => x.email.toLowerCase() !== where.email.toLowerCase());
        }
        return { count: count - this.users.length };
      },
    };
  }

  get studentProfile() {
    return {
      findUnique: async ({ where, include }) => {
        const p = this.studentProfiles.find(x => (where.id && x.id === where.id) || (where.userId && x.userId === where.userId) || (where.studentId && x.studentId === where.studentId));
        if (!p) return null;
        return this._populateProfile(p, include);
      },
      findFirst: async ({ where, include }) => {
        const p = this.studentProfiles.find(x => this._matchWhere(x, where));
        if (!p) return null;
        return this._populateProfile(p, include);
      },
      findMany: async ({ where, include, select }) => {
        let list = this.studentProfiles.filter(p => {
          if (!where) return true;
          if (where.preference?.isComplete !== undefined) {
            const pref = this.preferences.find(pr => pr.studentProfileId === p.id);
            if ((pref?.isComplete ?? false) !== where.preference.isComplete) return false;
          }
          if (where.gender && p.gender !== where.gender) return false;
          if (where.id?.in && !where.id.in.includes(p.id)) return false;
          return true;
        });
        return list.map(p => {
          if (select) {
            const out = {};
            for (const k of Object.keys(select)) if (select[k]) out[k] = p[k];
            return out;
          }
          return this._populateProfile(p, include);
        });
      },
      count: async ({ where } = {}) => {
        const list = await this.studentProfile.findMany({ where });
        return list.length;
      },
      update: async ({ where, data, include }) => {
        const idx = this.studentProfiles.findIndex(x => (where.id && x.id === where.id) || (where.userId && x.userId === where.userId));
        if (idx === -1) throw new Error('Profile not found');
        this.studentProfiles[idx] = { ...this.studentProfiles[idx], ...data, updatedAt: new Date() };
        return this._populateProfile(this.studentProfiles[idx], include);
      },
    };
  }

  get preference() {
    return {
      findUnique: async ({ where }) => {
        return this.preferences.find(p => (where?.id && p.id === where.id) || (where?.studentProfileId && p.studentProfileId === where.studentProfileId)) || null;
      },
      findFirst: async ({ where }) => {
        return this.preferences.find(p => this._matchWhere(p, where)) || null;
      },
      findMany: async ({ where } = {}) => {
        let list = this.preferences;
        if (where) {
          list = list.filter(p => this._matchWhere(p, where));
        }
        return list;
      },
      count: async ({ where } = {}) => {
        let list = this.preferences;
        if (where?.isComplete !== undefined) list = list.filter(p => p.isComplete === where.isComplete);
        return list.length;
      },
      create: async ({ data }) => {
        const newPref = {
          id: `pref-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
          ...data,
          createdAt: new Date(),
          updatedAt: new Date(),
        };
        this.preferences.push(newPref);
        return newPref;
      },
      upsert: async ({ where, create, update }) => {
        const idx = this.preferences.findIndex(p => p.studentProfileId === where.studentProfileId);
        if (idx >= 0) {
          this.preferences[idx] = { ...this.preferences[idx], ...update, updatedAt: new Date() };
          return this.preferences[idx];
        } else {
          const newPref = {
            id: `pref-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
            ...create,
            createdAt: new Date(),
            updatedAt: new Date(),
          };
          this.preferences.push(newPref);
          return newPref;
        }
      },
    };
  }

  get room() {
    return {
      findUnique: async ({ where }) => this.rooms.find(r => r.id === where.id) || null,
      findFirst: async ({ where }) => this.rooms.find(r => this._matchWhere(r, where)) || null,
      findMany: async ({ where, include, orderBy } = {}) => {
        let list = this.rooms.filter(r => {
          if (!where) return true;
          if (where.status && r.status !== where.status) return false;
          if (where.gender && r.gender !== where.gender && r.gender !== 'MIXED') return false;
          return true;
        });
        return list.map(r => {
          const allocations = this.roomAllocations
            .filter(a => a.roomId === r.id && (!include?.allocations?.where?.status?.in || include.allocations.where.status.in.includes(a.status)))
            .map(a => this._populateAllocation(a, include?.allocations?.include || { studentProfile: { include: { preference: true, user: true } }, matchingRun: true }));
          return {
            ...r,
            allocations,
            _count: { allocations: allocations.length },
          };
        });
      },
      count: async ({ where } = {}) => {
        const list = await this.room.findMany({ where });
        return list.length;
      },
      create: async ({ data }) => {
        const newRoom = {
          id: `rm-${Date.now()}`,
          ...data,
          status: data.status || 'AVAILABLE',
          createdAt: new Date(),
          updatedAt: new Date(),
        };
        this.rooms.push(newRoom);
        return newRoom;
      },
      update: async ({ where, data }) => {
        const idx = this.rooms.findIndex(r => r.id === where.id);
        if (idx === -1) throw new Error('Room not found');
        this.rooms[idx] = { ...this.rooms[idx], ...data, updatedAt: new Date() };
        return this.rooms[idx];
      },
      delete: async ({ where }) => {
        this.rooms = this.rooms.filter(r => r.id !== where.id);
        return { success: true };
      },
    };
  }

  get matchingRun() {
    return {
      findUnique: async ({ where, include }) => {
        const run = this.matchingRuns.find(r => r.id === where.id);
        if (!run) return null;
        return this._populateRun(run, include);
      },
      findFirst: async ({ where, orderBy } = {}) => {
        let list = this.matchingRuns.filter(r => this._matchWhere(r, where));
        if (orderBy?.createdAt === 'desc') list = [...list].reverse();
        const run = list[0] || null;
        return run ? this._populateRun(run) : null;
      },
      findMany: async ({ orderBy, take = 20 } = {}) => {
        let list = [...this.matchingRuns];
        if (orderBy?.createdAt === 'desc') list = list.reverse();
        return list.slice(0, take).map(r => this._populateRun(r));
      },
      create: async ({ data }) => {
        const run = {
          id: `run-${Date.now()}`,
          status: data.status || 'RUNNING',
          totalStudents: data.totalStudents || 0,
          totalRooms: data.totalRooms || 0,
          studentsAssigned: data.studentsAssigned || 0,
          studentsUnassigned: data.studentsUnassigned || 0,
          avgCompatibility: data.avgCompatibility || null,
          algorithmVersion: data.algorithmVersion || '1.0.0',
          createdAt: new Date(),
          updatedAt: new Date(),
        };
        this.matchingRuns.push(run);
        return run;
      },
      update: async ({ where, data }) => {
        const idx = this.matchingRuns.findIndex(r => r.id === where.id);
        if (idx === -1) throw new Error('Run not found');
        this.matchingRuns[idx] = { ...this.matchingRuns[idx], ...data, updatedAt: new Date() };
        return this.matchingRuns[idx];
      },
    };
  }

  get roomAllocation() {
    return {
      findFirst: async ({ where, include, orderBy }) => {
        let list = this.roomAllocations.filter(a => this._matchWhere(a, where));
        if (orderBy?.createdAt === 'desc') list = [...list].reverse();
        const a = list[0] || null;
        if (!a) return null;
        return this._populateAllocation(a, include);
      },
      findMany: async ({ where, include }) => {
        let list = this.roomAllocations.filter(a => this._matchWhere(a, where));
        return list.map(a => this._populateAllocation(a, include));
      },
      count: async ({ where } = {}) => {
        const list = this.roomAllocations.filter(a => this._matchWhere(a, where));
        return list.length;
      },
      create: async ({ data }) => {
        const alloc = {
          id: `alloc-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
          ...data,
          status: data.status || 'PENDING',
          createdAt: new Date(),
          updatedAt: new Date(),
        };
        this.roomAllocations.push(alloc);
        return alloc;
      },
      createMany: async ({ data, skipDuplicates }) => {
        const items = Array.isArray(data) ? data : [data];
        items.forEach(d => {
          this.roomAllocations.push({
            id: `alloc-${Date.now()}-${Math.random().toString(36).substr(2, 6)}`,
            ...d,
            status: d.status || 'PENDING',
            createdAt: new Date(),
            updatedAt: new Date(),
          });
        });
        return { count: items.length };
      },
      updateMany: async ({ where, data }) => {
        let count = 0;
        this.roomAllocations = this.roomAllocations.map(a => {
          if (this._matchWhere(a, where)) {
            count++;
            return { ...a, ...data, updatedAt: new Date() };
          }
          return a;
        });
        return { count };
      },
      delete: async ({ where }) => {
        this.roomAllocations = this.roomAllocations.filter(a => a.id !== where.id);
        return { success: true };
      },
      deleteMany: async ({ where }) => {
        const prevLen = this.roomAllocations.length;
        this.roomAllocations = this.roomAllocations.filter(a => !this._matchWhere(a, where));
        return { count: prevLen - this.roomAllocations.length };
      },
    };
  }

  get compatibilityScore() {
    return {
      findMany: async ({ where, select, include, orderBy, take }) => {
        let list = this.compatibilityScores.filter(s => {
          if (!where) return true;
          if (where.matchingRunId && s.matchingRunId !== where.matchingRunId) return false;
          if (where.hardConflict !== undefined && s.hardConflict !== where.hardConflict) return false;
          if (where.score?.gte !== undefined && s.score < where.score.gte) return false;
          if (where.OR) {
            const matchesOr = where.OR.some(cond => {
              if (cond.studentAId?.in && cond.studentAId.in.includes(s.studentAId)) return true;
              if (cond.studentBId?.in && cond.studentBId.in.includes(s.studentBId)) return true;
              if (cond.studentAId && s.studentAId === cond.studentAId) return true;
              if (cond.studentBId && s.studentBId === cond.studentBId) return true;
              return false;
            });
            if (!matchesOr) return false;
          }
          return true;
        });
        if (orderBy?.score === 'desc') list = [...list].sort((a, b) => b.score - a.score);
        if (take) list = list.slice(0, take);
        return list.map(s => {
          if (select) {
            const out = {};
            for (const k of Object.keys(select)) if (select[k]) out[k] = s[k];
            return out;
          }
          return {
            ...s,
            studentA: include?.studentA ? this.studentProfiles.find(p => p.id === s.studentAId) : undefined,
            studentB: include?.studentB ? this.studentProfiles.find(p => p.id === s.studentBId) : undefined,
          };
        });
      },
      create: async ({ data }) => {
        const score = {
          id: `cs-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
          ...data,
          createdAt: new Date(),
        };
        this.compatibilityScores.push(score);
        return score;
      },
      createMany: async ({ data, skipDuplicates }) => {
        const items = Array.isArray(data) ? data : [data];
        items.forEach(d => {
          this.compatibilityScores.push({
            id: `cs-${Date.now()}-${Math.random().toString(36).substr(2, 6)}`,
            ...d,
            createdAt: new Date(),
          });
        });
        return { count: items.length };
      },
      deleteMany: async ({ where }) => {
        const prevLen = this.compatibilityScores.length;
        this.compatibilityScores = this.compatibilityScores.filter(s => !this._matchWhere(s, where));
        return { count: prevLen - this.compatibilityScores.length };
      },
    };
  }

  get feedback() {
    return {
      findFirst: async ({ where }) => this.feedbacks.find(f => this._matchWhere(f, where)) || null,
      findMany: async ({ include, select, orderBy }) => {
        let list = [...this.feedbacks];
        if (orderBy?.createdAt === 'desc') list = list.reverse();
        return list.map(f => {
          if (select) {
            const out = {};
            for (const k of Object.keys(select)) if (select[k]) out[k] = f[k];
            return out;
          }
          return {
            ...f,
            studentProfile: include?.studentProfile ? this.studentProfiles.find(p => p.id === f.studentProfileId) : undefined,
            roomAllocation: include?.roomAllocation ? this._populateAllocation(this.roomAllocations.find(a => a.id === f.roomAllocationId), include.roomAllocation.include) : undefined,
          };
        });
      },
      count: async () => this.feedbacks.length,
      aggregate: async () => {
        const avg = this.feedbacks.length > 0
          ? this.feedbacks.reduce((a, f) => a + f.overallSatisfaction, 0) / this.feedbacks.length
          : null;
        return {
          _avg: { overallSatisfaction: avg },
          _count: this.feedbacks.length,
        };
      },
      create: async ({ data }) => {
        const fb = {
          id: `fb-${Date.now()}`,
          ...data,
          createdAt: new Date(),
          updatedAt: new Date(),
        };
        this.feedbacks.push(fb);
        return fb;
      },
    };
  }

  get systemSettings() {
    return {
      findUnique: async () => ({ ...this.systemSettingsRecord }),
      findFirst: async () => ({ ...this.systemSettingsRecord }),
      upsert: async ({ create, update }) => {
        if (update) {
          if (update.questionnaireDeadline !== undefined) this.systemSettingsRecord.questionnaireDeadline = update.questionnaireDeadline;
          if (update.questionnaireOpen !== undefined) this.systemSettingsRecord.questionnaireOpen = update.questionnaireOpen;
          this.systemSettingsRecord.updatedAt = new Date();
        } else if (create) {
          this.systemSettingsRecord = { ...create, updatedAt: new Date() };
        }
        return { ...this.systemSettingsRecord };
      },
      update: async ({ data }) => {
        if (data.questionnaireDeadline !== undefined) this.systemSettingsRecord.questionnaireDeadline = data.questionnaireDeadline;
        if (data.questionnaireOpen !== undefined) this.systemSettingsRecord.questionnaireOpen = data.questionnaireOpen;
        this.systemSettingsRecord.updatedAt = new Date();
        return { ...this.systemSettingsRecord };
      },
    };
  }

  get otpVerification() {
    return {
      findUnique: async ({ where }) => {
        const item = this.otpVerifications.find(x => (where.id && x.id === where.id) || (where.email && x.email.toLowerCase() === where.email.toLowerCase()));
        return item ? { ...item } : null;
      },
      findFirst: async ({ where }) => {
        const item = this.otpVerifications.find(x => this._matchWhere(x, where));
        return item ? { ...item } : null;
      },
      create: async ({ data }) => {
        const record = {
          id: `otp-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
          email: data.email.toLowerCase(),
          otpHash: data.otpHash,
          expiresAt: new Date(data.expiresAt),
          attempts: data.attempts || 0,
          isUsed: data.isUsed || false,
          lastSentAt: data.lastSentAt ? new Date(data.lastSentAt) : new Date(),
          createdAt: new Date(),
          updatedAt: new Date(),
        };
        this.otpVerifications.push(record);
        return { ...record };
      },
      upsert: async ({ where, create, update }) => {
        const idx = this.otpVerifications.findIndex(x => (where.email && x.email.toLowerCase() === where.email.toLowerCase()) || (where.id && x.id === where.id));
        if (idx >= 0) {
          this.otpVerifications[idx] = {
            ...this.otpVerifications[idx],
            ...update,
            updatedAt: new Date(),
          };
          return { ...this.otpVerifications[idx] };
        } else {
          const record = {
            id: `otp-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
            email: create.email.toLowerCase(),
            otpHash: create.otpHash,
            expiresAt: new Date(create.expiresAt),
            attempts: create.attempts || 0,
            isUsed: create.isUsed || false,
            lastSentAt: create.lastSentAt ? new Date(create.lastSentAt) : new Date(),
            createdAt: new Date(),
            updatedAt: new Date(),
          };
          this.otpVerifications.push(record);
          return { ...record };
        }
      },
      update: async ({ where, data }) => {
        const idx = this.otpVerifications.findIndex(x => (where.email && x.email.toLowerCase() === where.email.toLowerCase()) || (where.id && x.id === where.id));
        if (idx < 0) throw new Error('Record not found');
        this.otpVerifications[idx] = {
          ...this.otpVerifications[idx],
          ...data,
          updatedAt: new Date(),
        };
        return { ...this.otpVerifications[idx] };
      },
      delete: async ({ where }) => {
        this.otpVerifications = this.otpVerifications.filter(x => !(where.id && x.id === where.id) && !(where.email && x.email.toLowerCase() === where.email.toLowerCase()));
        return { success: true };
      },
      deleteMany: async ({ where } = {}) => {
        if (!where || Object.keys(where).length === 0) {
          const count = this.otpVerifications.length;
          this.otpVerifications = [];
          return { count };
        }
        const initial = this.otpVerifications.length;
        this.otpVerifications = this.otpVerifications.filter(x => !this._matchWhere(x, where));
        return { count: initial - this.otpVerifications.length };
      },
    };
  }

  _populateUser(u, include) {
    if (!include) return u;
    const res = { ...u };
    if (include.profile) {
      const p = this.studentProfiles.find(x => x.userId === u.id);
      res.profile = p ? this._populateProfile(p, typeof include.profile === 'object' ? include.profile.include : undefined) : null;
    }
    return res;
  }

  _populateProfile(p, include) {
    if (!p) return null;
    const res = { ...p };
    // Always attach user
    const u = this.users.find(x => x.id === p.userId);
    if (u) {
      res.user = { id: u.id, email: u.email, role: u.role };
    }
    // Always attach preference if present in store
    const pref = this.preferences.find(x => x.studentProfileId === p.id);
    if (pref) {
      res.preference = pref;
    } else if (include?.preference) {
      res.preference = null;
    }
    if (include?.allocations) {
      res.allocations = this.roomAllocations.filter(x => x.studentProfileId === p.id).map(a => this._populateAllocation(a, { room: true }));
    }
    if (include?.feedbacks) {
      res.feedbacks = this.feedbacks.filter(x => x.studentProfileId === p.id);
    }
    return res;
  }

  _populateAllocation(a, include) {
    if (!a) return null;
    const res = { ...a };
    if (include?.room) res.room = this.rooms.find(r => r.id === a.roomId) || null;
    if (include?.studentProfile) {
      const p = this.studentProfiles.find(x => x.id === a.studentProfileId);
      res.studentProfile = p ? this._populateProfile(p, typeof include.studentProfile === 'object' ? include.studentProfile.include : { preference: true, user: true }) : null;
    }
    if (include?.matchingRun) res.matchingRun = this.matchingRuns.find(r => r.id === a.matchingRunId) || null;
    return res;
  }

  _populateRun(run, include) {
    const res = { ...run };
    if (include?.allocations) {
      res.allocations = this.roomAllocations.filter(a => a.matchingRunId === run.id).map(a => this._populateAllocation(a, include.allocations.include));
    }
    return res;
  }

  _matchWhere(item, where) {
    if (!where) return true;
    for (const k of Object.keys(where)) {
      const val = where[k];
      if (val === undefined) continue;
      if (k === 'OR' && Array.isArray(val)) {
        const matchesAny = val.some(sub => this._matchWhere(item, sub));
        if (!matchesAny) return false;
        continue;
      }
      if (typeof val === 'object' && val !== null) {
        if (val.in && Array.isArray(val.in) && !val.in.includes(item[k])) return false;
        if (val.not && item[k] === val.not) return false;
        if (val.gte !== undefined && item[k] < val.gte) return false;
        if (val.equals !== undefined && item[k] !== val.equals) return false;
      } else {
        if (item[k] !== val) return false;
      }
    }
    return true;
  }
}

module.exports = { MemoryPrismaStore };
