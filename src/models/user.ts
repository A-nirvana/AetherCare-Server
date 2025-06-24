interface User {
  userId: string;
  bmi: number;
  name: string;
  sex?: "M" | "F" | "Other";
  age?: number;
}

interface Medic {
  medicId: string;
}

class UsersModel {
  users: User[];

  constructor() {
    const userId = '202506290000'; // e.g., YYYYMMDD + 4 digits
    this.users = [{ userId,name:"Mr. Ravi Sharma",bmi: 24.9, age:76, sex:"M" }];
  }

  getUsers(): User[] {
    return this.users;
  }
}

class MedicModel {
  medics: Medic[];
  constructor() {
    const medicId = '2025179001';
    this.medics = [{ medicId }];
  }
  getMedics(): Medic[] {
    return this.medics;
  }
} 

const usersModel = new UsersModel();
const medicModel = new MedicModel();

export { usersModel, medicModel };
export default usersModel;
