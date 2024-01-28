<?php

declare(strict_types=1);

namespace Migrations\MySql;

use Doctrine\DBAL\Schema\Schema;
use Doctrine\Migrations\AbstractMigration;

/**
 * Auto-generated Migration: Please modify to your needs!
 */
final class Version20240126180633 extends AbstractMigration
{
    public function getDescription(): string
    {
        return '';
    }

    public function up(Schema $schema): void
    {
        // this up() migration is auto-generated, please modify it to your needs
        $this->addSql('CREATE TABLE aws (id BINARY(16) NOT NULL COMMENT \'(DC2Type:uuid_binary)\', user_id BINARY(16) DEFAULT NULL COMMENT \'(DC2Type:uuid_binary)\', customer_id VARCHAR(255) NOT NULL, dimension VARCHAR(255) NOT NULL, created_at DATETIME NOT NULL, updated_at DATETIME DEFAULT NULL, UNIQUE INDEX UNIQ_1F26B7B2A76ED395 (user_id), UNIQUE INDEX UNIQ_1F26B7B2A76ED3959395C3F3CA9BC19C (user_id, customer_id, dimension), PRIMARY KEY(id)) DEFAULT CHARACTER SET utf8mb4 COLLATE `utf8mb4_unicode_ci` ENGINE = InnoDB');
        $this->addSql('ALTER TABLE aws ADD CONSTRAINT FK_1F26B7B2A76ED395 FOREIGN KEY (user_id) REFERENCES user (id)');
    }

    public function down(Schema $schema): void
    {
        // this down() migration is auto-generated, please modify it to your needs
        $this->addSql('ALTER TABLE aws DROP FOREIGN KEY FK_1F26B7B2A76ED395');
        $this->addSql('DROP TABLE aws');
    }
}
