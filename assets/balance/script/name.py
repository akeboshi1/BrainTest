import os
import shutil
from pathlib import Path
import argparse

def batch_rename_images(folder_path, prefix="image", start_number=1, extension_filter=None):
    """
    批量重命名文件夹中的图片文件

    Args:
        folder_path (str): 图片文件夹路径
        prefix (str): 新文件名前缀，默认为"image"
        start_number (int): 起始编号，默认为1
        extension_filter (list): 文件扩展名过滤器，如['.jpg', '.png', '.gif']
    """

    # 支持的图片格式
    if extension_filter is None:
        extension_filter = ['.jpg', '.jpeg', '.png', '.gif', '.bmp', '.tiff', '.webp']

    # 确保文件夹路径存在
    if not os.path.exists(folder_path):
        print(f"错误：文件夹 '{folder_path}' 不存在！")
        return

    # 获取文件夹中的所有文件
    files = []
    for file in os.listdir(folder_path):
        file_path = os.path.join(folder_path, file)
        if os.path.isfile(file_path):
            # 检查文件扩展名
            file_ext = os.path.splitext(file)[1].lower()
            if file_ext in extension_filter:
                files.append((file, file_ext))

    if not files:
        print(f"在文件夹 '{folder_path}' 中没有找到图片文件！")
        return

    # 按文件名排序
    files.sort()

    print(f"找到 {len(files)} 个图片文件：")
    for i, (old_name, ext) in enumerate(files):
        new_name = f"{prefix}_{start_number + i:03d}{ext}"
        print(f"  {old_name} -> {new_name}")

    # 询问用户是否继续
    confirm = input("\n是否继续重命名？(y/n): ").lower().strip()
    if confirm != 'y':
        print("操作已取消")
        return

    # 执行重命名
    success_count = 0
    for i, (old_name, ext) in enumerate(files):
        old_path = os.path.join(folder_path, old_name)
        new_name = f"{prefix}_{start_number + i:03d}{ext}"
        new_path = os.path.join(folder_path, new_name)

        try:
            # 如果新文件名已存在，先重命名为临时名称
            if os.path.exists(new_path):
                temp_name = f"temp_{new_name}"
                temp_path = os.path.join(folder_path, temp_name)
                os.rename(old_path, temp_path)
                old_path = temp_path
                old_name = temp_name

            os.rename(old_path, new_path)
            success_count += 1
            print(f"✓ {old_name} -> {new_name}")

        except Exception as e:
            print(f"✗ 重命名 {old_name} 失败：{str(e)}")

    print(f"\n重命名完成！成功重命名 {success_count}/{len(files)} 个文件")

def main():
    parser = argparse.ArgumentParser(description="批量重命名图片文件")
    parser.add_argument("folder", help="图片文件夹路径")
    parser.add_argument("-p", "--prefix", default="image", help="新文件名前缀（默认：image）")
    parser.add_argument("-s", "--start", type=int, default=1, help="起始编号（默认：1）")
    parser.add_argument("-e", "--extensions", nargs="+",
                        default=['.jpg', '.jpeg', '.png', '.gif', '.bmp', '.tiff', '.webp'],
                        help="文件扩展名过滤器")

    args = parser.parse_args()

    # 如果没有提供命令行参数，使用交互式模式
    if len(os.sys.argv) == 1:
        print("=== 图片批量重命名工具 ===\n")

        folder_path = input("请输入图片文件夹路径: ").strip()
        if not folder_path:
            print("路径不能为空！")
            return

        prefix = input("请输入新文件名前缀（默认：image）: ").strip()
        if not prefix:
            prefix = "image"

        start_input = input("请输入起始编号（默认：1）: ").strip()
        start_number = int(start_input) if start_input.isdigit() else 1

        print(f"\n将重命名文件夹 '{folder_path}' 中的图片文件")
        print(f"新文件名格式：{prefix}_001, {prefix}_002, ...")
        print(f"起始编号：{start_number}")

        batch_rename_images(folder_path, prefix, start_number, args.extensions)
    else:
        # 使用命令行参数
        batch_rename_images(args.folder, args.prefix, args.start, args.extensions)

if __name__ == "__main__":
    main()