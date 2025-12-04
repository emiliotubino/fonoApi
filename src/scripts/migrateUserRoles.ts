import { connectDB } from '../database/connection';
import User from '../models/users';

/**
 * Script para migrar usuários existentes e adicionar o campo 'role'
 * - Atualiza todos usuários sem role para 'patient'
 * - Opcionalmente promove o primeiro usuário criado para 'superadmin'
 */
const migrateRoles = async () => {
  try {
    console.log('🚀 Iniciando migração de roles...\n');

    await connectDB();

    // Contar usuários sem role
    const usersWithoutRole = await User.countDocuments({ role: { $exists: false } });
    console.log(`📊 Usuários sem role encontrados: ${usersWithoutRole}`);

    if (usersWithoutRole === 0) {
      console.log('✅ Todos os usuários já possuem role definido!\n');
    } else {
      // Atualizar todos usuários sem role para 'patient'
      const result = await User.updateMany(
        { role: { $exists: false } },
        { $set: { role: 'patient' } }
      );

      console.log(`✅ ${result.modifiedCount} usuários atualizados para role: 'patient'\n`);
    }

    // Verificar se já existe um superadmin
    const superadminExists = await User.findOne({ role: 'superadmin' });

    if (superadminExists) {
      console.log(`👑 Superadmin já existe: ${superadminExists.email}\n`);
    } else {
      // Promover o primeiro usuário criado para superadmin
      const firstUser = await User.findOne().sort({ createdAt: 1 });

      if (firstUser) {
        firstUser.role = 'superadmin';
        await firstUser.save();
        console.log(`👑 Primeiro usuário promovido para superadmin:`);
        console.log(`   Email: ${firstUser.email}`);
        console.log(`   Nome: ${firstUser.firstName} ${firstUser.lastName}\n`);
      } else {
        console.log('⚠️  Nenhum usuário encontrado no banco de dados.\n');
      }
    }

    // Mostrar estatísticas finais
    const totalUsers = await User.countDocuments();
    const superadmins = await User.countDocuments({ role: 'superadmin' });
    const patients = await User.countDocuments({ role: 'patient' });

    console.log('📈 Estatísticas finais:');
    console.log(`   Total de usuários: ${totalUsers}`);
    console.log(`   Superadmins: ${superadmins}`);
    console.log(`   Patients: ${patients}\n`);

    console.log('✅ Migração concluída com sucesso!');
    process.exit(0);
  } catch (error) {
    console.error('❌ Erro durante a migração:', error);
    process.exit(1);
  }
};

// Executar migração
migrateRoles();
