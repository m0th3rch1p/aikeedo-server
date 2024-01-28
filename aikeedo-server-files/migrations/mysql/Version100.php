<?php

declare(strict_types=1);

namespace Migrations\MySql;

use Doctrine\DBAL\Schema\Schema;
use Doctrine\Migrations\AbstractMigration;

/**
 * Auto-generated Migration: Please modify to your needs!
 */
final class Version100 extends AbstractMigration
{
    public function getDescription(): string
    {
        return '';
    }

    public function up(Schema $schema): void
    {
        // this up() migration is auto-generated, please modify it to your needs
        $this->addSql('CREATE TABLE category (id BINARY(16) NOT NULL COMMENT \'(DC2Type:uuid_binary)\', created_at DATETIME NOT NULL, updated_at DATETIME DEFAULT NULL, title VARCHAR(255) NOT NULL, PRIMARY KEY(id)) DEFAULT CHARACTER SET utf8mb4 COLLATE `utf8mb4_unicode_ci` ENGINE = InnoDB');
        $this->addSql('CREATE TABLE document (id BINARY(16) NOT NULL COMMENT \'(DC2Type:uuid_binary)\', user_id BINARY(16) NOT NULL COMMENT \'(DC2Type:uuid_binary)\', preset_id BINARY(16) DEFAULT NULL COMMENT \'(DC2Type:uuid_binary)\', created_at DATETIME NOT NULL, updated_at DATETIME DEFAULT NULL, title VARCHAR(255) NOT NULL, output LONGTEXT DEFAULT NULL, INDEX IDX_D8698A76A76ED395 (user_id), INDEX IDX_D8698A7680688E6F (preset_id), PRIMARY KEY(id)) DEFAULT CHARACTER SET utf8mb4 COLLATE `utf8mb4_unicode_ci` ENGINE = InnoDB');
        $this->addSql('CREATE TABLE `option` (id BINARY(16) NOT NULL COMMENT \'(DC2Type:uuid_binary)\', created_at DATETIME NOT NULL, updated_at DATETIME DEFAULT NULL, `key` VARCHAR(255) NOT NULL, value LONGTEXT DEFAULT NULL, UNIQUE INDEX UNIQ_5A8600B04E645A7E (`key`), PRIMARY KEY(id)) DEFAULT CHARACTER SET utf8mb4 COLLATE `utf8mb4_unicode_ci` ENGINE = InnoDB');
        $this->addSql('CREATE TABLE plan (id BINARY(16) NOT NULL COMMENT \'(DC2Type:uuid_binary)\', billing_cycle VARCHAR(255) DEFAULT NULL, created_at DATETIME NOT NULL, updated_at DATETIME DEFAULT NULL, status SMALLINT NOT NULL, title VARCHAR(255) NOT NULL, description LONGTEXT DEFAULT NULL, price INT NOT NULL, token_credit_count INT DEFAULT NULL, image_credit_count INT DEFAULT NULL, audio_credit_count INT DEFAULT NULL, superiority SMALLINT NOT NULL, is_featured TINYINT(1) NOT NULL, PRIMARY KEY(id)) DEFAULT CHARACTER SET utf8mb4 COLLATE `utf8mb4_unicode_ci` ENGINE = InnoDB');
        $this->addSql('CREATE TABLE preset (id BINARY(16) NOT NULL COMMENT \'(DC2Type:uuid_binary)\', category_id BINARY(16) DEFAULT NULL COMMENT \'(DC2Type:uuid_binary)\', type VARCHAR(255) NOT NULL, status SMALLINT NOT NULL, is_locked TINYINT(1) NOT NULL, created_at DATETIME NOT NULL, updated_at DATETIME DEFAULT NULL, title VARCHAR(255) NOT NULL, description LONGTEXT DEFAULT NULL, template LONGTEXT DEFAULT NULL, image LONGTEXT DEFAULT NULL, color LONGTEXT DEFAULT NULL, INDEX IDX_2C5FE43212469DE2 (category_id), PRIMARY KEY(id)) DEFAULT CHARACTER SET utf8mb4 COLLATE `utf8mb4_unicode_ci` ENGINE = InnoDB');
        $this->addSql('CREATE TABLE subscription (id BINARY(16) NOT NULL COMMENT \'(DC2Type:uuid_binary)\', user_id BINARY(16) NOT NULL COMMENT \'(DC2Type:uuid_binary)\', plan_id BINARY(16) NOT NULL COMMENT \'(DC2Type:uuid_binary)\', currency VARCHAR(3) NOT NULL, status INT NOT NULL, created_at DATETIME NOT NULL, updated_at DATETIME DEFAULT NULL, expire_at DATETIME DEFAULT NULL, reset_credits_at DATETIME DEFAULT NULL, trial_period_days INT DEFAULT NULL, payment_gateway VARCHAR(255) DEFAULT NULL, token_usage_count INT DEFAULT NULL, image_usage_count INT DEFAULT NULL, audio_usage_count INT DEFAULT NULL, external_id VARCHAR(255) DEFAULT NULL, customer_external_id VARCHAR(255) DEFAULT NULL, price_external_id VARCHAR(255) DEFAULT NULL, product_external_id VARCHAR(255) DEFAULT NULL, INDEX IDX_A3C664D3A76ED395 (user_id), INDEX IDX_A3C664D3E899029B (plan_id), UNIQUE INDEX UNIQ_A3C664D3DB7D3959F75D7B0 (payment_gateway, external_id), PRIMARY KEY(id)) DEFAULT CHARACTER SET utf8mb4 COLLATE `utf8mb4_unicode_ci` ENGINE = InnoDB');
        $this->addSql('CREATE TABLE user (id BINARY(16) NOT NULL COMMENT \'(DC2Type:uuid_binary)\', active_subscription_id BINARY(16) DEFAULT NULL COMMENT \'(DC2Type:uuid_binary)\', role SMALLINT NOT NULL, created_at DATETIME NOT NULL, updated_at DATETIME DEFAULT NULL, status SMALLINT NOT NULL, email VARCHAR(255) NOT NULL, password_hash VARCHAR(255) NOT NULL, first_name VARCHAR(255) NOT NULL, last_name VARCHAR(255) NOT NULL, language VARCHAR(5) NOT NULL, recovery_token VARCHAR(255) DEFAULT NULL, UNIQUE INDEX UNIQ_8D93D649E7927C74 (email), UNIQUE INDEX UNIQ_8D93D6499A208144 (active_subscription_id), INDEX IDX_8D93D649A9D1C132 (first_name), INDEX IDX_8D93D649C808BA5A (last_name), PRIMARY KEY(id)) DEFAULT CHARACTER SET utf8mb4 COLLATE `utf8mb4_unicode_ci` ENGINE = InnoDB');
        $this->addSql('ALTER TABLE document ADD CONSTRAINT FK_D8698A76A76ED395 FOREIGN KEY (user_id) REFERENCES user (id) ON DELETE CASCADE');
        $this->addSql('ALTER TABLE document ADD CONSTRAINT FK_D8698A7680688E6F FOREIGN KEY (preset_id) REFERENCES preset (id) ON DELETE SET NULL');
        $this->addSql('ALTER TABLE preset ADD CONSTRAINT FK_2C5FE43212469DE2 FOREIGN KEY (category_id) REFERENCES category (id) ON DELETE SET NULL');
        $this->addSql('ALTER TABLE subscription ADD CONSTRAINT FK_A3C664D3A76ED395 FOREIGN KEY (user_id) REFERENCES user (id)');
        $this->addSql('ALTER TABLE subscription ADD CONSTRAINT FK_A3C664D3E899029B FOREIGN KEY (plan_id) REFERENCES plan (id)');
        $this->addSql('ALTER TABLE user ADD CONSTRAINT FK_8D93D6499A208144 FOREIGN KEY (active_subscription_id) REFERENCES subscription (id)');
    }

    public function down(Schema $schema): void
    {
        // this down() migration is auto-generated, please modify it to your needs
        $this->addSql('ALTER TABLE document DROP FOREIGN KEY FK_D8698A76A76ED395');
        $this->addSql('ALTER TABLE document DROP FOREIGN KEY FK_D8698A7680688E6F');
        $this->addSql('ALTER TABLE preset DROP FOREIGN KEY FK_2C5FE43212469DE2');
        $this->addSql('ALTER TABLE subscription DROP FOREIGN KEY FK_A3C664D3A76ED395');
        $this->addSql('ALTER TABLE subscription DROP FOREIGN KEY FK_A3C664D3E899029B');
        $this->addSql('ALTER TABLE user DROP FOREIGN KEY FK_8D93D6499A208144');
        $this->addSql('DROP TABLE category');
        $this->addSql('DROP TABLE document');
        $this->addSql('DROP TABLE `option`');
        $this->addSql('DROP TABLE plan');
        $this->addSql('DROP TABLE preset');
        $this->addSql('DROP TABLE subscription');
        $this->addSql('DROP TABLE user');
    }
}
